import 'package:hive/hive.dart';

part 'exercise.g.dart';

@HiveType(typeId: 1)
class Exercise extends HiveObject {
  @HiveField(0)
  String id;
  
  @HiveField(1)
  String subject;
  
  @HiveField(2)
  String grade;
  
  @HiveField(3)
  String topic;
  
  @HiveField(4)
  String difficulty;
  
  @HiveField(5)
  String content;
  
  @HiveField(6)
  int questionCount;
  
  @HiveField(7)
  DateTime createdAt;

  Exercise({
    required this.id,
    required this.subject,
    required this.grade,
    required this.topic,
    required this.difficulty,
    required this.content,
    required this.questionCount,
    required this.createdAt,
  });

  @override
  String toString() {
    return 'Exercise{id: $id, subject: $subject, grade: $grade, difficulty: $difficulty}';
  }

  Exercise copyWith({
    String? id,
    String? subject,
    String? grade,
    String? topic,
    String? difficulty,
    String? content,
    int? questionCount,
    DateTime? createdAt,
  }) {
    return Exercise(
      id: id ?? this.id,
      subject: subject ?? this.subject,
      grade: grade ?? this.grade,
      topic: topic ?? this.topic,
      difficulty: difficulty ?? this.difficulty,
      content: content ?? this.content,
      questionCount: questionCount ?? this.questionCount,
      createdAt: createdAt ?? this.createdAt,
    );
  }
} 