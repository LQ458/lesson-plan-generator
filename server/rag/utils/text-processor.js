/**
 * 文本处理工具
 */

const config = require("../config/vector-db-config");

class TextProcessor {
  constructor() {
    this.subjects = config.subjects;
    this.grades = config.grades;
  }

  /**
   * 从文件名提取学科信息
   */
  extractSubject(filename) {
    const normalizedFilename = filename.toLowerCase();

    for (const subject of this.subjects) {
      if (normalizedFilename.includes(subject)) {
        return subject;
      }
    }

    // 特殊处理一些变体
    const subjectVariants = {
      道德与法治: "政治",
      思想品德: "政治",
      科学: "物理",
      自然: "生物",
      社会: "历史",
    };

    for (const [variant, subject] of Object.entries(subjectVariants)) {
      if (normalizedFilename.includes(variant)) {
        return subject;
      }
    }

    return "其他";
  }

  /**
   * 从文件名提取年级信息
   */
  extractGrade(filename) {
    const normalizedFilename = filename.toLowerCase();

    // 直接匹配年级
    for (const grade of this.grades) {
      if (normalizedFilename.includes(grade)) {
        return grade;
      }
    }

    // 处理数字年级格式
    const gradePatterns = [
      { pattern: /[第]?一年级|1年级/, grade: "一年级" },
      { pattern: /[第]?二年级|2年级/, grade: "二年级" },
      { pattern: /[第]?三年级|3年级/, grade: "三年级" },
      { pattern: /[第]?四年级|4年级/, grade: "四年级" },
      { pattern: /[第]?五年级|5年级/, grade: "五年级" },
      { pattern: /[第]?六年级|6年级/, grade: "六年级" },
      { pattern: /[第]?七年级|7年级|初一/, grade: "七年级" },
      { pattern: /[第]?八年级|8年级|初二/, grade: "八年级" },
      { pattern: /[第]?九年级|9年级|初三/, grade: "九年级" },
    ];

    for (const { pattern, grade } of gradePatterns) {
      if (pattern.test(normalizedFilename)) {
        return grade;
      }
    }

    return "未知";
  }

  /**
   * 清理和标准化文本内容
   */
  cleanText(text) {
    if (!text || typeof text !== "string") {
      return "";
    }

    return (
      text
        // 移除多余空白字符
        .replace(/\s+/g, " ")
        // 移除特殊控制字符
        .replace(/[\x00-\x1F\x7F]/g, "")
        // 标准化换行符
        .replace(/\r\n|\r/g, "\n")
        // 移除开头和结尾的空白
        .trim()
    );
  }

  /**
   * 提取关键词
   */
  extractKeywords(text, maxKeywords = 10) {
    if (!text) return [];

    // 教育领域常见关键词
    const educationKeywords = [
      "教学目标",
      "学习目标",
      "教学重点",
      "教学难点",
      "教学方法",
      "教学过程",
      "课堂活动",
      "练习",
      "作业",
      "评价",
      "反思",
      "知识",
      "技能",
      "能力",
      "素养",
      "思维",
      "创新",
      "实践",
    ];

    // 简单的关键词提取（基于词频）
    const words = text
      .replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 1);

    const wordCount = {};
    words.forEach((word) => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });

    // 优先教育关键词
    const keywords = Object.entries(wordCount)
      .sort((a, b) => {
        const aIsEducation = educationKeywords.includes(a[0]);
        const bIsEducation = educationKeywords.includes(b[0]);

        if (aIsEducation && !bIsEducation) return -1;
        if (!aIsEducation && bIsEducation) return 1;

        return b[1] - a[1]; // 按频率排序
      })
      .slice(0, maxKeywords)
      .map(([word]) => word);

    return keywords;
  }

  /**
   * 计算文本质量分数
   */
  calculateQualityScore(text) {
    if (!text || text.length === 0) return 0;

    let score = 0;
    const maxScore = 5;

    // 长度评分 (0-1分)
    const lengthScore = Math.min(text.length / 500, 1);
    score += lengthScore;

    // 教育内容评分 (0-2分)
    const educationKeywords = [
      "教学",
      "学习",
      "目标",
      "重点",
      "难点",
      "方法",
      "过程",
      "活动",
      "练习",
      "作业",
      "评价",
      "学生",
      "教师",
      "课堂",
    ];

    const keywordCount = educationKeywords.filter((keyword) =>
      text.includes(keyword),
    ).length;

    const educationScore = Math.min(keywordCount / 5, 2);
    score += educationScore;

    // 结构化程度评分 (0-1分)
    const structureKeywords = [
      "一、",
      "二、",
      "三、",
      "1.",
      "2.",
      "3.",
      "（一）",
      "（二）",
    ];
    const hasStructure = structureKeywords.some((keyword) =>
      text.includes(keyword),
    );
    if (hasStructure) score += 1;

    // 完整性评分 (0-1分)
    const completenessKeywords = ["总结", "小结", "作业", "练习", "反思"];
    const hasCompleteness = completenessKeywords.some((keyword) =>
      text.includes(keyword),
    );
    if (hasCompleteness) score += 1;

    return Math.min(Math.round(score * 10) / 10, maxScore);
  }

  /**
   * 生成文档摘要
   */
  generateSummary(text, maxLength = 100) {
    if (!text || text.length <= maxLength) return text;

    // 尝试在句号处截断
    const sentences = text.split(/[。！？]/);
    let summary = "";

    for (const sentence of sentences) {
      if (summary.length + sentence.length <= maxLength) {
        summary += sentence + "。";
      } else {
        break;
      }
    }

    // 如果没有合适的句号截断点，直接截断
    if (summary.length === 0) {
      summary = text.substring(0, maxLength) + "...";
    }

    return summary.trim();
  }

  /**
   * 验证文档格式
   */
  validateDocumentFormat(document) {
    const errors = [];

    if (!document.filename) {
      errors.push("缺少文件名");
    }

    if (!document.chunks || !Array.isArray(document.chunks)) {
      errors.push("缺少有效的文档块数组");
    } else if (document.chunks.length === 0) {
      errors.push("文档块数组为空");
    }

    if (document.chunks) {
      document.chunks.forEach((chunk, index) => {
        if (!chunk.content || chunk.content.trim().length === 0) {
          errors.push(`第${index + 1}个文档块内容为空`);
        }

        if (!chunk.embedding || !Array.isArray(chunk.embedding)) {
          errors.push(`第${index + 1}个文档块缺少嵌入向量`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

module.exports = new TextProcessor();
