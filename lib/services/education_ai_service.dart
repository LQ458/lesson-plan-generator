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
      throw Exception('❌ 教育专业教案生成失败\n\n原因：${e.toString()}\n\n请检查：\n1. 网络连接是否正常\n2. API密钥是否正确配置\n3. 账号余额是否充足\n\n👉 前往"个人中心 → AI服务配置"检查设置');
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
      throw Exception('❌ 教育专业练习题生成失败\n\n原因：${e.toString()}\n\n请检查：\n1. 网络连接是否正常\n2. API密钥是否正确配置\n3. 账号余额是否充足\n\n👉 前往"个人中心 → AI服务配置"检查设置');
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