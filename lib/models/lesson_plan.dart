import 'package:hive/hive.dart';

part 'lesson_plan.g.dart';

@HiveType(typeId: 0)
class LessonPlan extends HiveObject {
  @HiveField(0)
  String id;
  
  @HiveField(1)
  String title;
  
  @HiveField(2)
  String subject;
  
  @HiveField(3)
  String grade;
  
  @HiveField(4)
  String topic;
  
  @HiveField(5)
  String content;
  
  @HiveField(6)
  DateTime createdAt;
  
  @HiveField(7)
  DateTime updatedAt;

  // 导出时需要的额外字段（从content中解析或生成默认值）
  String get duration => '1课时'; // 默认课时
  String get objectives => _extractObjectives(); // 从content中提取教学目标
  String get methods => _extractMethods(); // 从content中提取教学方法
  String get assessment => _extractAssessment(); // 从content中提取教学评估

  LessonPlan({
    required this.id,
    required this.title,
    required this.subject,
    required this.grade,
    required this.topic,
    required this.content,
    required this.createdAt,
    required this.updatedAt,
  });

  // 从content中提取教学目标
  String _extractObjectives() {
    if (content.contains('教学目标') || content.contains('学习目标')) {
      final lines = content.split('\n');
      for (int i = 0; i < lines.length; i++) {
        if (lines[i].toLowerCase().contains('目标')) {
          // 提取目标相关的内容
          final result = StringBuffer();
          for (int j = i; j < lines.length && j < i + 3; j++) {
            if (lines[j].trim().isNotEmpty) {
              result.writeln(lines[j]);
            }
          }
          return result.toString().trim();
        }
      }
    }
    return '通过本节课的学习，学生能够掌握${topic}的基本概念和应用。';
  }

  // 从content中提取教学方法
  String _extractMethods() {
    if (content.contains('教学方法') || content.contains('方法')) {
      final lines = content.split('\n');
      for (int i = 0; i < lines.length; i++) {
        if (lines[i].toLowerCase().contains('方法')) {
          final result = StringBuffer();
          for (int j = i; j < lines.length && j < i + 2; j++) {
            if (lines[j].trim().isNotEmpty) {
              result.writeln(lines[j]);
            }
          }
          return result.toString().trim();
        }
      }
    }
    return '讲授法、讨论法、实践法相结合。';
  }

  // 从content中提取教学评估
  String _extractAssessment() {
    if (content.contains('评估') || content.contains('评价')) {
      final lines = content.split('\n');
      for (int i = 0; i < lines.length; i++) {
        if (lines[i].toLowerCase().contains('评估') || lines[i].toLowerCase().contains('评价')) {
          final result = StringBuffer();
          for (int j = i; j < lines.length && j < i + 2; j++) {
            if (lines[j].trim().isNotEmpty) {
              result.writeln(lines[j]);
            }
          }
          return result.toString().trim();
        }
      }
    }
    return '通过课堂参与、作业完成情况和测验成绩进行综合评估。';
  }

  // 便于调试和显示
  @override
  String toString() {
    return 'LessonPlan{id: $id, title: $title, subject: $subject, grade: $grade}';
  }

  // 复制方法，便于编辑
  LessonPlan copyWith({
    String? id,
    String? title,
    String? subject,
    String? grade,
    String? topic,
    String? content,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return LessonPlan(
      id: id ?? this.id,
      title: title ?? this.title,
      subject: subject ?? this.subject,
      grade: grade ?? this.grade,
      topic: topic ?? this.topic,
      content: content ?? this.content,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
} 