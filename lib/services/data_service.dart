import 'package:hive_flutter/hive_flutter.dart';
import '../models/lesson_plan.dart';
import '../models/exercise.dart';
import '../models/mistake_record.dart';

class DataService {
  static late Box<LessonPlan> _lessonPlanBox;
  static late Box<Exercise> _exerciseBox;
  static late Box<MistakeRecord> _mistakeBox;
  static late Box<String> _settingsBox;

  /// 初始化数据库
  static Future<void> init() async {
    // 注册适配器
    if (!Hive.isAdapterRegistered(0)) {
      Hive.registerAdapter(LessonPlanAdapter());
    }
    if (!Hive.isAdapterRegistered(1)) {
      Hive.registerAdapter(ExerciseAdapter());
    }
    if (!Hive.isAdapterRegistered(2)) {
      Hive.registerAdapter(MistakeRecordAdapter());
    }

    // 打开数据库
    _lessonPlanBox = await Hive.openBox<LessonPlan>('lesson_plans');
    _exerciseBox = await Hive.openBox<Exercise>('exercises');
    _mistakeBox = await Hive.openBox<MistakeRecord>('mistakes');
    _settingsBox = await Hive.openBox<String>('settings');
  }

  /// 清空所有数据
  static Future<void> clearAllData() async {
    await _lessonPlanBox.clear();
    await _exerciseBox.clear();
    await _mistakeBox.clear();
  }

  // ==================== 教案相关操作 ====================

  /// 保存教案
  static Future<void> saveLessonPlan(LessonPlan plan) async {
    await _lessonPlanBox.put(plan.id, plan);
  }

  /// 获取所有教案
  static List<LessonPlan> getAllLessonPlans() {
    return _lessonPlanBox.values.toList()
      ..sort((a, b) => b.createdAt.compareTo(a.createdAt));
  }

  /// 根据ID获取教案
  static LessonPlan? getLessonPlanById(String id) {
    return _lessonPlanBox.get(id);
  }

  /// 删除教案
  static Future<void> deleteLessonPlan(String id) async {
    await _lessonPlanBox.delete(id);
  }

  /// 搜索教案
  static List<LessonPlan> searchLessonPlans(String query) {
    if (query.isEmpty) return getAllLessonPlans();
    
    String lowerQuery = query.toLowerCase();
    return _lessonPlanBox.values.where((plan) =>
      plan.title.toLowerCase().contains(lowerQuery) ||
      plan.subject.toLowerCase().contains(lowerQuery) ||
      plan.grade.toLowerCase().contains(lowerQuery) ||
      plan.topic.toLowerCase().contains(lowerQuery)
    ).toList()
      ..sort((a, b) => b.createdAt.compareTo(a.createdAt));
  }

  /// 按学科筛选教案
  static List<LessonPlan> filterLessonPlansBySubject(String subject) {
    if (subject.isEmpty || subject == '全部') return getAllLessonPlans();
    
    return _lessonPlanBox.values.where((plan) => plan.subject == subject).toList()
      ..sort((a, b) => b.createdAt.compareTo(a.createdAt));
  }

  /// 按年级筛选教案
  static List<LessonPlan> filterLessonPlansByGrade(String grade) {
    if (grade.isEmpty || grade == '全部') return getAllLessonPlans();
    
    return _lessonPlanBox.values.where((plan) => plan.grade == grade).toList()
      ..sort((a, b) => b.createdAt.compareTo(a.createdAt));
  }

  // ==================== 练习题相关操作 ====================

  /// 保存练习题
  static Future<void> saveExercise(Exercise exercise) async {
    await _exerciseBox.put(exercise.id, exercise);
  }

  /// 获取所有练习题
  static List<Exercise> getAllExercises() {
    return _exerciseBox.values.toList()
      ..sort((a, b) => b.createdAt.compareTo(a.createdAt));
  }

  /// 根据ID获取练习题
  static Exercise? getExerciseById(String id) {
    return _exerciseBox.get(id);
  }

  /// 删除练习题
  static Future<void> deleteExercise(String id) async {
    await _exerciseBox.delete(id);
  }

  /// 搜索练习题
  static List<Exercise> searchExercises(String query) {
    if (query.isEmpty) return getAllExercises();
    
    String lowerQuery = query.toLowerCase();
    return _exerciseBox.values.where((exercise) =>
      exercise.subject.toLowerCase().contains(lowerQuery) ||
      exercise.grade.toLowerCase().contains(lowerQuery) ||
      exercise.topic.toLowerCase().contains(lowerQuery) ||
      exercise.difficulty.toLowerCase().contains(lowerQuery)
    ).toList()
      ..sort((a, b) => b.createdAt.compareTo(a.createdAt));
  }

  /// 按难度筛选练习题
  static List<Exercise> filterExercisesByDifficulty(String difficulty) {
    if (difficulty.isEmpty || difficulty == '全部') return getAllExercises();
    
    return _exerciseBox.values.where((exercise) => exercise.difficulty == difficulty).toList()
      ..sort((a, b) => b.createdAt.compareTo(a.createdAt));
  }

  /// 按学科筛选练习题
  static List<Exercise> filterExercisesBySubject(String subject) {
    if (subject.isEmpty || subject == '全部') return getAllExercises();
    
    return _exerciseBox.values.where((exercise) => exercise.subject == subject).toList()
      ..sort((a, b) => b.createdAt.compareTo(a.createdAt));
  }

  // ==================== 错题记录相关操作 ====================

  /// 保存错题记录
  static Future<void> saveMistakeRecord(MistakeRecord record) async {
    await _mistakeBox.put(record.id, record);
  }

  /// 获取所有错题记录
  static List<MistakeRecord> getAllMistakeRecords() {
    return _mistakeBox.values.toList()
      ..sort((a, b) => b.recordedAt.compareTo(a.recordedAt));
  }

  /// 根据ID获取错题记录
  static MistakeRecord? getMistakeRecordById(String id) {
    return _mistakeBox.get(id);
  }

  /// 删除错题记录
  static Future<void> deleteMistakeRecord(String id) async {
    await _mistakeBox.delete(id);
  }

  /// 标记错题为已解决
  static Future<void> markMistakeAsResolved(String id) async {
    MistakeRecord? record = _mistakeBox.get(id);
    if (record != null) {
      MistakeRecord updatedRecord = record.copyWith(isResolved: true);
      await _mistakeBox.put(id, updatedRecord);
    }
  }

  /// 搜索错题记录
  static List<MistakeRecord> searchMistakeRecords(String query) {
    if (query.isEmpty) return getAllMistakeRecords();
    
    String lowerQuery = query.toLowerCase();
    return _mistakeBox.values.where((record) =>
      record.studentName.toLowerCase().contains(lowerQuery) ||
      record.subject.toLowerCase().contains(lowerQuery) ||
      record.questionContent.toLowerCase().contains(lowerQuery) ||
      record.knowledgePoint.toLowerCase().contains(lowerQuery)
    ).toList()
      ..sort((a, b) => b.recordedAt.compareTo(a.recordedAt));
  }

  /// 按学生筛选错题记录
  static List<MistakeRecord> filterMistakesByStudent(String studentName) {
    if (studentName.isEmpty || studentName == '全部') return getAllMistakeRecords();
    
    return _mistakeBox.values.where((record) => record.studentName == studentName).toList()
      ..sort((a, b) => b.recordedAt.compareTo(a.recordedAt));
  }

  /// 按学科筛选错题记录
  static List<MistakeRecord> filterMistakesBySubject(String subject) {
    if (subject.isEmpty || subject == '全部') return getAllMistakeRecords();
    
    return _mistakeBox.values.where((record) => record.subject == subject).toList()
      ..sort((a, b) => b.recordedAt.compareTo(a.recordedAt));
  }

  /// 按解决状态筛选错题记录
  static List<MistakeRecord> filterMistakesByStatus(bool? isResolved) {
    if (isResolved == null) return getAllMistakeRecords();
    
    return _mistakeBox.values.where((record) => record.isResolved == isResolved).toList()
      ..sort((a, b) => b.recordedAt.compareTo(a.recordedAt));
  }

  // ==================== 统计分析功能 ====================

  /// 获取学科分布统计
  static Map<String, int> getSubjectDistribution() {
    Map<String, int> distribution = {};
    
    for (MistakeRecord record in _mistakeBox.values) {
      distribution[record.subject] = (distribution[record.subject] ?? 0) + 1;
    }
    
    return distribution;
  }

  /// 获取知识点错误统计
  static Map<String, int> getKnowledgePointMistakes() {
    Map<String, int> mistakes = {};
    
    for (MistakeRecord record in _mistakeBox.values) {
      mistakes[record.knowledgePoint] = (mistakes[record.knowledgePoint] ?? 0) + 1;
    }
    
    // 按错误次数排序
    var sortedEntries = mistakes.entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));
    
    return Map.fromEntries(sortedEntries);
  }

  /// 获取学生错题统计
  static Map<String, int> getStudentMistakeStats() {
    Map<String, int> stats = {};
    
    for (MistakeRecord record in _mistakeBox.values) {
      stats[record.studentName] = (stats[record.studentName] ?? 0) + 1;
    }
    
    return stats;
  }

  /// 获取错题解决率
  static double getMistakeResolutionRate() {
    List<MistakeRecord> allMistakes = getAllMistakeRecords();
    if (allMistakes.isEmpty) return 0.0;
    
    int resolvedCount = allMistakes.where((record) => record.isResolved).length;
    return resolvedCount / allMistakes.length;
  }

  /// 获取最近7天的错题趋势
  static Map<DateTime, int> getRecentMistakeTrend() {
    Map<DateTime, int> trend = {};
    DateTime now = DateTime.now();
    
    // 初始化最近7天的数据
    for (int i = 6; i >= 0; i--) {
      DateTime date = DateTime(now.year, now.month, now.day - i);
      trend[date] = 0;
    }
    
    // 统计每天的错题数量
    for (MistakeRecord record in _mistakeBox.values) {
      DateTime recordDate = DateTime(
        record.recordedAt.year,
        record.recordedAt.month,
        record.recordedAt.day,
      );
      
      if (trend.containsKey(recordDate)) {
        trend[recordDate] = trend[recordDate]! + 1;
      }
    }
    
    return trend;
  }

  // ==================== 数据导出功能 ====================

  /// 导出教案数据为JSON
  static Map<String, dynamic> exportLessonPlansToJson() {
    List<Map<String, dynamic>> plans = getAllLessonPlans().map((plan) => {
      'id': plan.id,
      'title': plan.title,
      'subject': plan.subject,
      'grade': plan.grade,
      'topic': plan.topic,
      'content': plan.content,
      'createdAt': plan.createdAt.toIso8601String(),
      'updatedAt': plan.updatedAt.toIso8601String(),
    }).toList();
    
    return {
      'lesson_plans': plans,
      'exported_at': DateTime.now().toIso8601String(),
      'total_count': plans.length,
    };
  }

  /// 导出错题分析报告
  static Map<String, dynamic> exportMistakeAnalysisReport() {
    return {
      'summary': {
        'total_mistakes': _mistakeBox.length,
        'resolution_rate': getMistakeResolutionRate(),
        'generated_at': DateTime.now().toIso8601String(),
      },
      'subject_distribution': getSubjectDistribution(),
      'knowledge_point_mistakes': getKnowledgePointMistakes(),
      'student_stats': getStudentMistakeStats(),
      'recent_trend': getRecentMistakeTrend().map(
        (date, count) => MapEntry(date.toIso8601String(), count),
      ),
    };
  }

  // ==================== 工具方法 ====================

  /// 获取所有唯一的学科列表
  static List<String> getAllSubjects() {
    Set<String> subjects = {};
    
    for (LessonPlan plan in _lessonPlanBox.values) {
      subjects.add(plan.subject);
    }
    for (Exercise exercise in _exerciseBox.values) {
      subjects.add(exercise.subject);
    }
    for (MistakeRecord record in _mistakeBox.values) {
      subjects.add(record.subject);
    }
    
    return subjects.toList()..sort();
  }

  /// 获取所有唯一的年级列表
  static List<String> getAllGrades() {
    Set<String> grades = {};
    
    for (LessonPlan plan in _lessonPlanBox.values) {
      grades.add(plan.grade);
    }
    for (Exercise exercise in _exerciseBox.values) {
      grades.add(exercise.grade);
    }
    
    return grades.toList()..sort();
  }

  /// 获取所有唯一的学生姓名列表
  static List<String> getAllStudentNames() {
    Set<String> names = {};
    
    for (MistakeRecord record in _mistakeBox.values) {
      names.add(record.studentName);
    }
    
    return names.toList()..sort();
  }
} 