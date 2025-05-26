import 'package:hive/hive.dart';

part 'mistake_record.g.dart';

@HiveType(typeId: 2)
class MistakeRecord extends HiveObject {
  @HiveField(0)
  String id;
  
  @HiveField(1)
  String studentName;
  
  @HiveField(2)
  String subject;
  
  @HiveField(3)
  String questionContent;
  
  @HiveField(4)
  String correctAnswer;
  
  @HiveField(5)
  String studentAnswer;
  
  @HiveField(6)
  String knowledgePoint;
  
  @HiveField(7)
  String difficulty;
  
  @HiveField(8)
  DateTime recordedAt;
  
  @HiveField(9)
  bool isResolved;

  MistakeRecord({
    required this.id,
    required this.studentName,
    required this.subject,
    required this.questionContent,
    required this.correctAnswer,
    required this.studentAnswer,
    required this.knowledgePoint,
    required this.difficulty,
    required this.recordedAt,
    this.isResolved = false,
  });

  @override
  String toString() {
    return 'MistakeRecord{id: $id, student: $studentName, subject: $subject, resolved: $isResolved}';
  }

  MistakeRecord copyWith({
    String? id,
    String? studentName,
    String? subject,
    String? questionContent,
    String? correctAnswer,
    String? studentAnswer,
    String? knowledgePoint,
    String? difficulty,
    DateTime? recordedAt,
    bool? isResolved,
  }) {
    return MistakeRecord(
      id: id ?? this.id,
      studentName: studentName ?? this.studentName,
      subject: subject ?? this.subject,
      questionContent: questionContent ?? this.questionContent,
      correctAnswer: correctAnswer ?? this.correctAnswer,
      studentAnswer: studentAnswer ?? this.studentAnswer,
      knowledgePoint: knowledgePoint ?? this.knowledgePoint,
      difficulty: difficulty ?? this.difficulty,
      recordedAt: recordedAt ?? this.recordedAt,
      isResolved: isResolved ?? this.isResolved,
    );
  }
} 