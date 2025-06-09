import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'online_ai_service.dart';

class EducationAIService {
  static final EducationAIService _instance = EducationAIService._internal();
  factory EducationAIService() => _instance;
  EducationAIService._internal();

  final OnlineAIService _onlineAI = OnlineAIService();

  // 新课标核心素养映射
  static const Map<String, List<String>> _coreCompetencies = {
    '语文': ['语言建构与运用', '思维发展与提升', '审美鉴赏与创造', '文化传承与理解'],
    '数学': ['数学抽象', '逻辑推理', '数学建模', '直观想象', '数学运算', '数据分析'],
    '英语': ['语言能力', '学习能力', '思维品质', '文化品格'],
    '物理': ['物理观念', '科学思维', '科学探究', '科学态度与责任'],
    '化学': ['宏观辨识与微观探析', '变化观念与平衡思想', '证据推理与模型认知', '科学探究与创新意识', '科学态度与社会责任'],
  };

  // 年级知识体系映射
  static const Map<String, Map<String, List<String>>> _gradeKnowledge = {
    '小学': {
      '语文': ['拼音识字', '词语理解', '句子表达', '阅读理解', '作文写作', '古诗背诵'],
      '数学': ['数的认识', '四则运算', '图形认识', '测量', '统计与概率', '解决问题'],
      '英语': ['字母发音', '基础词汇', '简单对话', '日常表达'],
    },
    '初中': {
      '语文': ['现代文阅读', '古诗文阅读', '写作表达', '语言文字运用', '综合性学习'],
      '数学': ['数与代数', '图形与几何', '统计与概率', '综合与实践'],
      '英语': ['词汇语法', '听力理解', '阅读理解', '书面表达', '口语交际'],
      '物理': ['力学', '热学', '光学', '电学', '声学'],
      '化学': ['物质的性质', '物质的变化', '化学与生活', '科学探究'],
    },
  };

  // 教材版本特征
  static const Map<String, Map<String, String>> _textbookFeatures = {
    '人教版': {
      '特点': '全国使用最广，内容标准化程度高',
      '难度': '中等，循序渐进',
      '风格': '注重基础，突出重点',
    },
    '苏教版': {
      '特点': '江苏地区特色，注重思维训练',
      '难度': '相对较高，思维性强',
      '风格': '注重探究，培养能力',
    },
    '北师大版': {
      '特点': '数学见长，逻辑性强',
      '难度': '中等偏上',
      '风格': '注重数学思维，问题导向',
    },
  };

  // 生成符合新课标的教案
  Future<String> generateEducationLessonPlan({
    required String subject,
    required String grade,
    required String topic,
    String textbookVersion = '人教版',
    List<String>? focusCompetencies,
    String? requirements,
  }) async {
    final prompt = _buildEducationLessonPrompt(
      subject, grade, topic, textbookVersion, focusCompetencies, requirements
    );
    
    try {
      return await _onlineAI.generateLessonPlan(
        subject: subject,
        grade: grade,
        topic: topic,
        requirements: prompt,
      );
    } catch (e) {
      return _getEducationLessonTemplate(subject, grade, topic, textbookVersion);
    }
  }

  // 生成分层练习题（符合义务教育要求）
  Future<String> generateEducationExercises({
    required String subject,
    required String grade,
    required String topic,
    required String difficulty,
    required int count,
    String textbookVersion = '人教版',
    bool includeExploration = true,
  }) async {
    final prompt = _buildEducationExercisePrompt(
      subject, grade, topic, difficulty, count, textbookVersion, includeExploration
    );
    
    try {
      return await _onlineAI.generateExercises(
        subject: subject,
        grade: grade,
        topic: topic,
        difficulty: difficulty,
        count: count,
      );
    } catch (e) {
      return _getEducationExerciseTemplate(subject, grade, topic, difficulty, count);
    }
  }

  // 学情分析（基于OCR识别的作业）
  Future<String> analyzeStudentWork({
    required String subject,
    required String grade,
    required String recognizedText,
    required String topic,
  }) async {
    final prompt = '''
作为一名资深${subject}教师，请分析以下${grade}年级学生关于"${topic}"的作业：

学生作业内容：
${recognizedText}

请从以下维度进行专业分析：
1. **知识掌握情况**：学生对核心概念的理解程度
2. **常见错误分析**：识别典型错误并分析错误原因
3. **学习建议**：针对性的学习指导建议
4. **能力发展**：核心素养发展情况评价
5. **教学反思**：对教学方法的改进建议

要求：
- 分析具体、客观，避免空洞表述
- 提供可操作的改进建议
- 体现个性化教学理念
- 符合新课标要求
''';

    try {
      return await _onlineAI.analyzeContent(
        content: recognizedText,
        analysisType: '学生作业',
      );
    } catch (e) {
      return '学情分析需要网络连接，请检查网络后重试';
    }
  }

  // 构建教育专用提示词
  String _buildEducationLessonPrompt(
    String subject,
    String grade,
    String topic,
    String textbookVersion,
    List<String>? focusCompetencies,
    String? requirements,
  ) {
    final gradeCategory = _getGradeCategory(grade);
    final subjectCompetencies = _coreCompetencies[subject] ?? [];
    final knowledgePoints = _gradeKnowledge[gradeCategory]?[subject] ?? [];
    final textbookInfo = _textbookFeatures[textbookVersion] ?? {};

    return '''
请为${grade}年级${subject}科目设计关于"${topic}"的教案（${textbookVersion}）。

【教学背景】
- 年级阶段：${gradeCategory}
- 教材版本：${textbookVersion}（${textbookInfo['特点'] ?? ''}）
- 难度定位：${textbookInfo['难度'] ?? '适中'}
- 教学风格：${textbookInfo['风格'] ?? '注重基础'}

【核心素养要求】
${subject}学科核心素养：${subjectCompetencies.join('、')}
${focusCompetencies?.isNotEmpty == true ? '重点培养：${focusCompetencies!.join('、')}' : ''}

【知识体系】
${gradeCategory}${subject}主要内容：${knowledgePoints.join('、')}

【教案要求】
1. 严格遵循《义务教育${subject}课程标准（2022年版）》
2. 体现"立德树人"根本任务
3. 突出学科核心素养培养
4. 采用情境化、活动化、体验化教学
5. 设计分层作业，关注个体差异
6. 体现跨学科融合思维
7. 注重过程性评价设计

【特殊要求】
${requirements ?? '无特殊要求'}

请生成完整、详实的教案，确保符合新课标要求和教育部相关规定。
''';
  }

  // 构建教育练习题提示词
  String _buildEducationExercisePrompt(
    String subject,
    String grade,
    String topic,
    String difficulty,
    int count,
    String textbookVersion,
    bool includeExploration,
  ) {
    final gradeCategory = _getGradeCategory(grade);
    
    return '''
请为${grade}年级${subject}科目"${topic}"设计${count}道练习题（${textbookVersion}）。

【题目要求】
1. **基础题（${(count * 0.4).round()}道）**：巩固基本概念和技能
2. **提高题（${(count * 0.4).round()}道）**：培养分析和应用能力
3. **拓展题（${(count * 0.2).round()}道）**：发展创新思维${includeExploration ? '和探究能力' : ''}

【设计原则】
- 符合${gradeCategory}学生认知特点
- 体现${subject}学科核心素养
- 难度梯度合理，循序渐进
- 联系生活实际，体现应用价值
- 鼓励多元解法，培养创新思维

【题型分布】
- 选择题：考查基础概念理解
- 填空题：训练基本技能
- 解答题：培养逻辑推理和表达能力
${includeExploration ? '- 探究题：发展科学思维和实践能力' : ''}

【评价标准】
每题必须包含：题目、标准答案、详细解析、能力考查点、难度等级

请确保题目原创、科学准确、表述清晰。
''';
  }

  // 获取年级分类
  String _getGradeCategory(String grade) {
    final gradeNum = RegExp(r'\d+').stringMatch(grade);
    if (gradeNum != null) {
      final num = int.tryParse(gradeNum) ?? 0;
      return num <= 6 ? '小学' : '初中';
    }
    return grade.contains('小学') ? '小学' : '初中';
  }

  // 教育专用教案模板
  String _getEducationLessonTemplate(String subject, String grade, String topic, String textbookVersion) {
    final gradeCategory = _getGradeCategory(grade);
    final competencies = _coreCompetencies[subject]?.take(2).join('、') ?? '核心素养';
    
    return '''
# ${topic}教案（${subject} ${grade}年级 ${textbookVersion}）

## 教学目标

### 核心素养目标
通过本节课学习，发展学生的${competencies}，培养学科思维能力。

### 具体目标
1. **知识与技能**：理解${topic}的概念，掌握基本方法
2. **过程与方法**：经历探究过程，形成科学思维
3. **情感态度价值观**：增强学习兴趣，培养科学精神

## 教学重难点
- **重点**：${topic}的核心概念和基本应用
- **难点**：概念的深层理解和实际运用

## 教学过程

### 一、情境导入（5分钟）
创设真实情境，联系生活实际，激发学习兴趣，引出本课主题。

### 二、探究新知（25分钟）
#### 1. 概念建构（10分钟）
- 引导学生观察、思考、发现
- 师生互动，构建概念
- 明确概念的本质特征

#### 2. 方法探索（10分钟）
- 学生自主探索解决方法
- 小组合作交流讨论
- 教师适时引导点拨

#### 3. 应用实践（5分钟）
- 基础练习巩固理解
- 变式练习深化认知

### 三、总结拓展（8分钟）
#### 1. 知识梳理（3分钟）
学生自主梳理本课所学，构建知识网络

#### 2. 能力提升（5分钟）
联系实际，拓展应用，发展核心素养

### 四、作业设计（2分钟）
#### 基础作业
巩固基本概念和方法

#### 拓展作业
联系生活实际，培养应用能力

## 板书设计
```
${topic}
├── 概念：[核心定义]
├── 特征：[主要特点]
├── 方法：[解决策略]
└── 应用：[实际运用]
```

## 教学反思
关注学生学习过程，及时调整教学策略，体现个性化教学。

*注：此为基础模板，建议结合具体教学内容和学生实际情况进行调整*
''';
  }

  // 教育专用练习题模板
  String _getEducationExerciseTemplate(String subject, String grade, String topic, String difficulty, int count) {
    return '''
# ${topic}练习题（${grade}年级 ${difficulty}难度）

## 基础巩固题

### 题目1：概念理解
**题目**：下列关于${topic}的表述中，正确的是（　）
A. [选项A - 基础概念]
B. [选项B - 关键特征]  
C. [选项C - 常见误区]
D. [选项D - 拓展理解]

**答案**：B
**解析**：考查对${topic}基本概念的理解。正确答案体现了核心特征...
**能力考查**：概念理解、基础记忆
**难度等级**：★☆☆

## 能力提升题

### 题目2：方法应用
**题目**：某实际问题中涉及${topic}，请运用所学知识分析解决...

**解答要点**：
1. 分析题意，明确问题本质
2. 选择合适方法，建立模型
3. 求解过程，得出结论

**能力考查**：分析应用、逻辑推理
**难度等级**：★★☆

## 探究拓展题

### 题目3：综合探究
**题目**：通过查阅资料或实际调查，探究${topic}在生活中的应用...

**探究建议**：
- 收集相关资料
- 进行实地调研
- 分析整理数据
- 得出结论建议

**能力考查**：探究实践、创新思维
**难度等级**：★★★

*注：题目数量为示例，实际应生成${count}道完整题目*
''';
  }

  // 设置API密钥
  void setApiKey(String apiKey, {String provider = 'qianwen'}) {
    _onlineAI.setApiKey(apiKey, provider: provider);
  }

  // 生成教案（主要接口）
  Future<String> generateLessonPlan({
    required String subject,
    required String grade,
    required String topic,
    String? requirements,
  }) async {
    return await generateEducationLessonPlan(
      subject: subject,
      grade: grade,
      topic: topic,
      requirements: requirements,
    );
  }

  // 生成练习题（主要接口）
  Future<String> generateExercises({
    required String subject,
    required String grade,
    required String topic,
    required String difficulty,
    required int count,
  }) async {
    return await generateEducationExercises(
      subject: subject,
      grade: grade,
      topic: topic,
      difficulty: difficulty,
      count: count,
    );
  }

  // 分析学习内容（主要接口）
  Future<String> analyzeContent({
    required String content,
    required String analysisType,
  }) async {
    try {
      return await _onlineAI.analyzeContent(
        content: content,
        analysisType: analysisType,
      );
    } catch (e) {
      return '内容分析暂时不可用，请稍后重试。分析类型：$analysisType';
    }
  }

  // 获取服务状态
  Map<String, dynamic> getServiceStatus() {
    return {
      '服务类型': '教育专业AI服务',
      '目标用户': '中国九年义务教育教师',
      '核心素养数量': _coreCompetencies.keys.length,
      '教材版本支持': _textbookFeatures.keys.length,
      '在线AI状态': _onlineAI.getServiceStatus(),
    };
  }
} 