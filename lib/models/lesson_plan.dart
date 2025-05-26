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