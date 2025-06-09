// 导出格式枚举
enum LessonExportFormat {
  pdf,
  ppt,
  mindMapImage, // 思维导图图片
  outlineImage, // 大纲图片
}

// 导出格式扩展
extension LessonExportFormatExtension on LessonExportFormat {
  String get displayName {
    switch (this) {
      case LessonExportFormat.pdf:
        return 'PDF文档';
      case LessonExportFormat.ppt:
        return 'PPT演示';
      case LessonExportFormat.mindMapImage:
        return '思维导图图片';
      case LessonExportFormat.outlineImage:
        return '大纲图片';
    }
  }

  String get description {
    switch (this) {
      case LessonExportFormat.pdf:
        return '适合打印和正式文档';
      case LessonExportFormat.ppt:
        return '适合课堂演示教学';
      case LessonExportFormat.mindMapImage:
        return '思维导图可视化图片';
      case LessonExportFormat.outlineImage:
        return '教案大纲结构图片';
    }
  }

  String get fileExtension {
    switch (this) {
      case LessonExportFormat.pdf:
        return '.pdf';
      case LessonExportFormat.ppt:
        return '.pptx';
      case LessonExportFormat.mindMapImage:
        return '.png';
      case LessonExportFormat.outlineImage:
        return '.png';
    }
  }

  String get iconData {
    switch (this) {
      case LessonExportFormat.pdf:
        return 'picture_as_pdf';
      case LessonExportFormat.ppt:
        return 'slideshow';
      case LessonExportFormat.mindMapImage:
        return 'account_tree';
      case LessonExportFormat.outlineImage:
        return 'list_alt';
    }
  }
}

// 导出配置
class LessonExportConfig {
  final LessonExportFormat format;
  final String? template;
  final Map<String, dynamic>? customSettings;
  final bool includeMetadata;
  final String? customTitle;

  const LessonExportConfig({
    required this.format,
    this.template,
    this.customSettings,
    this.includeMetadata = true,
    this.customTitle,
  });

  // 默认配置
  static LessonExportConfig defaultConfig() {
    return const LessonExportConfig(
      format: LessonExportFormat.pdf,
      template: 'standard',
      customSettings: {},
    );
  }
}

// 导出结果类
class ExportResult {
  final LessonExportFormat format;
  final String content;
  final String filename;
  final String? previewData;

  const ExportResult({
    required this.format,
    required this.content,
    required this.filename,
    this.previewData,
  });
}

// 教案展示模板
class LessonTemplate {
  final String id;
  final String name;
  final String description;
  final LessonExportFormat supportedFormat;
  final Map<String, dynamic> structure;

  const LessonTemplate({
    required this.id,
    required this.name,
    required this.description,
    required this.supportedFormat,
    required this.structure,
  });

  static const List<LessonTemplate> defaultTemplates = [
    LessonTemplate(
      id: 'standard_lesson',
      name: '标准教案模板',
      description: '包含教学目标、重难点、教学过程等完整结构',
      supportedFormat: LessonExportFormat.pdf,
      structure: {
        'sections': ['教学目标', '教学重难点', '教学过程', '板书设计', '作业布置'],
        'layout': 'traditional'
      },
    ),
    LessonTemplate(
      id: 'mind_map',
      name: '思维导图模板',
      description: '知识点关系可视化展示',
      supportedFormat: LessonExportFormat.mindMapImage,
      structure: {
        'centerNode': '教学主题',
        'branches': ['知识点', '教学方法', '学习活动', '评价方式'],
        'layout': 'radial'
      },
    ),
    LessonTemplate(
      id: 'presentation',
      name: 'PPT演示模板',
      description: '课堂演示专用，包含互动环节',
      supportedFormat: LessonExportFormat.ppt,
      structure: {
        'slides': ['标题页', '学习目标', '知识讲解', '练习活动', '总结回顾'],
        'layout': 'slides'
      },
    ),
  ];
} 