import 'dart:math';
import '../models/lesson_plan.dart';
import '../models/exercise.dart';
import '../models/mistake_record.dart';

class SampleDataService {
  static final Random _random = Random();

  // 学科列表
  static const List<String> subjects = ['数学', '语文', '英语', '物理', '化学', '生物', '历史', '地理'];
  
  // 年级列表
  static const List<String> grades = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级', '七年级', '八年级', '九年级'];
  
  // 难度等级
  static const List<String> difficulties = ['简单', '中等', '困难'];
  
  // 学生姓名
  static const List<String> studentNames = [
    '张小明', '李小红', '王小华', '刘小强', '陈小美', '杨小刚', '赵小丽', '孙小军',
    '周小芳', '吴小伟', '郑小娟', '冯小东', '陈小静', '褚小亮', '卫小霞', '蒋小涛'
  ];

  // 数学知识点
  static const Map<String, List<String>> mathTopics = {
    '一年级': ['数字认识', '加法运算', '减法运算', '图形认识'],
    '二年级': ['乘法口诀', '除法基础', '长度测量', '时间认识'],
    '三年级': ['分数初步', '小数认识', '面积计算', '周长计算'],
    '四年级': ['分数运算', '小数运算', '角度测量', '统计图表'],
    '五年级': ['分数加减法', '小数乘除法', '体积计算', '比例关系'],
    '六年级': ['分数乘除法', '百分数', '圆的面积', '立体图形'],
  };

  // 语文知识点
  static const Map<String, List<String>> chineseTopics = {
    '一年级': ['拼音学习', '汉字认识', '词语理解', '句子组成'],
    '二年级': ['词语搭配', '句子扩写', '标点符号', '短文阅读'],
    '三年级': ['成语学习', '修辞手法', '段落理解', '作文基础'],
    '四年级': ['古诗词', '文言文', '阅读理解', '写作技巧'],
    '五年级': ['文学常识', '说明文', '议论文', '记叙文'],
    '六年级': ['综合阅读', '写作提高', '语言运用', '文学鉴赏'],
  };

  /// 生成示例教案
  static List<LessonPlan> generateSampleLessonPlans({int count = 20}) {
    List<LessonPlan> plans = [];
    
    for (int i = 0; i < count; i++) {
      String subject = subjects[_random.nextInt(subjects.length)];
      String grade = grades[_random.nextInt(grades.length)];
      String topic = _getRandomTopic(subject, grade);
      
      plans.add(LessonPlan(
        id: 'lesson_${i + 1}',
        title: '$topic教案',
        subject: subject,
        grade: grade,
        topic: topic,
        content: _generateLessonContent(subject, grade, topic),
        createdAt: DateTime.now().subtract(Duration(days: _random.nextInt(30))),
        updatedAt: DateTime.now().subtract(Duration(days: _random.nextInt(7))),
      ));
    }
    
    return plans;
  }

  /// 生成示例练习题
  static List<Exercise> generateSampleExercises({int count = 15}) {
    List<Exercise> exercises = [];
    
    for (int i = 0; i < count; i++) {
      String subject = subjects[_random.nextInt(subjects.length)];
      String grade = grades[_random.nextInt(grades.length)];
      String topic = _getRandomTopic(subject, grade);
      String difficulty = difficulties[_random.nextInt(difficulties.length)];
      
      exercises.add(Exercise(
        id: 'exercise_${i + 1}',
        subject: subject,
        grade: grade,
        topic: topic,
        difficulty: difficulty,
        content: _generateExerciseContent(subject, grade, topic, difficulty),
        questionCount: _random.nextInt(10) + 5, // 5-14题
        createdAt: DateTime.now().subtract(Duration(days: _random.nextInt(20))),
      ));
    }
    
    return exercises;
  }

  /// 生成示例错题记录
  static List<MistakeRecord> generateSampleMistakeRecords({int count = 30}) {
    List<MistakeRecord> mistakes = [];
    
    for (int i = 0; i < count; i++) {
      String subject = subjects[_random.nextInt(subjects.length)];
      String grade = grades[_random.nextInt(grades.length)];
      String student = studentNames[_random.nextInt(studentNames.length)];
      String knowledgePoint = _getRandomTopic(subject, grade);
      String difficulty = difficulties[_random.nextInt(difficulties.length)];
      
      var questionData = _generateMistakeQuestion(subject, knowledgePoint, difficulty);
      
      mistakes.add(MistakeRecord(
        id: 'mistake_${i + 1}',
        studentName: student,
        subject: subject,
        questionContent: questionData['question']!,
        correctAnswer: questionData['correct']!,
        studentAnswer: questionData['wrong']!,
        knowledgePoint: knowledgePoint,
        difficulty: difficulty,
        recordedAt: DateTime.now().subtract(Duration(days: _random.nextInt(7))),
        isResolved: _random.nextBool(),
      ));
    }
    
    return mistakes;
  }

  /// 获取随机主题
  static String _getRandomTopic(String subject, String grade) {
    if (subject == '数学' && mathTopics.containsKey(grade)) {
      List<String> topics = mathTopics[grade]!;
      return topics[_random.nextInt(topics.length)];
    } else if (subject == '语文' && chineseTopics.containsKey(grade)) {
      List<String> topics = chineseTopics[grade]!;
      return topics[_random.nextInt(topics.length)];
    } else {
      return '${subject}基础知识';
    }
  }

  /// 生成教案内容
  static String _generateLessonContent(String subject, String grade, String topic) {
    return '''
# $topic 教案

## 基本信息
- **学科**: $subject
- **年级**: $grade
- **课时**: 1课时

## 教学目标
1. **知识目标**: 理解$topic的基本概念和原理
2. **能力目标**: 掌握$topic的应用方法和解题技巧
3. **情感目标**: 培养学生的学习兴趣和探究精神

## 教学重点
- $topic的核心概念
- 基本应用方法

## 教学难点
- $topic的深层理解
- 灵活运用技巧

## 教学过程

### 一、导入新课（5分钟）
1. 复习相关知识
2. 创设问题情境
3. 引出本课主题

### 二、新课讲解（25分钟）
1. 讲解$topic的基本概念
2. 演示典型例题
3. 引导学生思考讨论

### 三、巩固练习（10分钟）
1. 基础练习
2. 提高练习
3. 拓展思考

### 四、课堂小结（5分钟）
1. 总结重点知识
2. 布置课后作业

## 板书设计
[${topic}知识结构图]

## 课后反思
本节课学生掌握情况良好，需要加强练习。
''';
  }

  /// 生成练习题内容
  static String _generateExerciseContent(String subject, String grade, String topic, String difficulty) {
    if (subject == '数学') {
      return _generateMathExercise(topic, difficulty);
    } else if (subject == '语文') {
      return _generateChineseExercise(topic, difficulty);
    } else {
      return '''
## $topic 练习题（$difficulty难度）

1. **基础题**: 请简述$topic的基本概念。

2. **应用题**: 举例说明$topic在实际中的应用。

3. **思考题**: 分析$topic的重要意义。

**参考答案**:
1. $topic是...
2. 应用实例包括...
3. 重要意义在于...
''';
    }
  }

  /// 生成数学练习题
  static String _generateMathExercise(String topic, String difficulty) {
    if (topic.contains('分数')) {
      return '''
## $topic 练习题（$difficulty难度）

1. **选择题**: 下列分数中，最大的是（ ）
   A. 3/5   B. 2/3   C. 5/8   D. 7/12
   **答案**: B

2. **填空题**: 计算：1/2 + 1/3 = ______
   **答案**: 5/6

3. **解答题**: 小明有3/4本书，他读了这些书的2/5。请问小明读了多少本书？
   **答案**: 3/4 × 2/5 = 6/20 = 3/10本

4. **应用题**: 一根绳子长5/6米，用去了1/3，还剩多少米？
   **答案**: 5/6 - 5/6 × 1/3 = 5/6 - 5/18 = 15/18 - 5/18 = 10/18 = 5/9米
''';
    } else {
      return '''
## $topic 练习题（$difficulty难度）

1. **基础计算**: 相关计算练习
2. **概念理解**: $topic概念题
3. **应用题**: 实际应用问题
4. **拓展题**: 综合运用题目

**答案解析**:
详细的解题步骤和方法说明...
''';
    }
  }

  /// 生成语文练习题
  static String _generateChineseExercise(String topic, String difficulty) {
    return '''
## $topic 练习题（$difficulty难度）

1. **基础题**: $topic相关的基础知识
2. **理解题**: 阅读理解练习
3. **应用题**: 写作或表达练习
4. **拓展题**: 综合运用题目

**参考答案**:
1. 基础知识要点...
2. 理解要点...
3. 写作要求...
4. 综合分析...
''';
  }

  /// 生成错题问题
  static Map<String, String> _generateMistakeQuestion(String subject, String knowledgePoint, String difficulty) {
    if (subject == '数学' && knowledgePoint.contains('分数')) {
      return {
        'question': '计算：1/2 + 1/3 = ?',
        'correct': '5/6',
        'wrong': '2/5',
      };
    } else if (subject == '数学' && knowledgePoint.contains('小数')) {
      return {
        'question': '计算：0.5 + 0.3 = ?',
        'correct': '0.8',
        'wrong': '0.53',
      };
    } else if (subject == '语文' && knowledgePoint.contains('拼音')) {
      return {
        'question': '"学习"的拼音是什么？',
        'correct': 'xué xí',
        'wrong': 'xué xì',
      };
    } else {
      return {
        'question': '$knowledgePoint相关问题',
        'correct': '正确答案',
        'wrong': '错误答案',
      };
    }
  }

  /// 清空所有示例数据
  static void clearAllSampleData() {
    // 这个方法将在数据服务中实现
  }

  /// 检查是否有示例数据
  static bool hasSampleData() {
    // 这个方法将在数据服务中实现
    return false;
  }
} 