"use client";

import { useState, useMemo, useEffect } from "react";
import DiagramRenderer from "./diagram-renderer";
import StreamingMarkdown from "./streaming-markdown";
import InteractiveFlowchart from "./interactive-flowchart";
import InteractiveLesson from "./interactive-lesson";
import {
  useSettings,
  getGradeLevelLabel,
  getSubjectLabel,
} from "@/lib/settings-context";

interface LessonPlanFormat {
  id: string;
  name: string;
  description: string;
  icon: string;
}

interface TeachingStage {
  stage: string;
  content: string[];
  duration?: number;
}

interface DiagramContent {
  objectives: string[];
  keyPoints: string[];
  difficulties: string[];
  methods: string[];
  process: TeachingStage[];
}

const formats: LessonPlanFormat[] = [
  {
    id: "text",
    name: "传统文本",
    description: "经典的文本格式教案",
    icon: "📝",
  },
  {
    id: "mindmap",
    name: "思维导图",
    description: "可视化知识结构图",
    icon: "🧠",
  },
  {
    id: "flowchart",
    name: "流程图",
    description: "教学步骤流程展示",
    icon: "📊",
  },
  {
    id: "timeline",
    name: "时间线",
    description: "课程时间安排图",
    icon: "⏰",
  },
  {
    id: "interactive",
    name: "交互式",
    description: "可点击展开的教案",
    icon: "🎯",
  },
];

interface LessonPlanGeneratorProps {
  lessonData: {
    subject: string;
    grade: string;
    title: string;
    duration:
      | number
      | {
          intro?: number;
          main?: number;
          practice?: number;
          summary?: number;
        };
    textContent?: string;
    detailedObjectives?: string[];
    keyPoints?: string[];
    difficulties?: string[];
    teachingMethods?: string[];
    teachingProcess?: Array<{
      stage: string;
      duration: number;
      content: string[];
    }>;
  } | null;
  isStreaming?: boolean;
}

export default function LessonPlanGenerator({
  lessonData,
  isStreaming,
}: LessonPlanGeneratorProps) {
  const { settings } = useSettings();
  const [selectedFormat, setSelectedFormat] = useState("text");
  const [isDarkMode, setIsDarkMode] = useState(false);
  // 默认使用标准复杂度和AI优化，不再提供用户选择
  const diagramComplexity: "simple" | "standard" | "detailed" = "standard";
  const useAITextProcessing = true;

  useEffect(() => {
    // 检测当前主题模式
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains("dark"));
    };

    checkDarkMode();

    // 监听主题变化
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  // 直接使用AI生成的教案内容，不添加任何模板数据
  const enrichedLessonData = useMemo(() => {
    if (!lessonData) return null;

    // 直接返回AI生成的原始数据，不做任何增强或模板填充
    return {
      ...lessonData,
      // 确保基本字段有值，但不使用模板内容
      subject: lessonData.subject || "",
      title: lessonData.title || "",
      // 只有当AI没有提供这些字段时才使用空数组，不使用模板内容
      detailedObjectives: lessonData.detailedObjectives || [],
      keyPoints: lessonData.keyPoints || [],
      difficulties: lessonData.difficulties || [],
      teachingMethods: lessonData.teachingMethods || [],
      teachingProcess: lessonData.teachingProcess || [],
    };
  }, [lessonData]);

  // 智能内容解析函数
  const parseAIContent = useMemo(() => {
    if (!enrichedLessonData?.textContent) return null;

    const content = enrichedLessonData.textContent;
    const parsed = {
      objectives: [] as string[],
      keyPoints: [] as string[],
      difficulties: [] as string[],
      methods: [] as string[],
      process: [] as { stage: string; content: string[]; duration?: number }[],
      materials: [] as string[],
      homework: [] as string[],
    };

    // 解析教学目标
    const objectiveMatch = content.match(
      /(?:教学目标|学习目标)[：:]\s*([\s\S]*?)(?=\n(?:##|教学重点|教学难点|$))/i,
    );
    if (objectiveMatch) {
      parsed.objectives = objectiveMatch[1]
        .split(/\n/)
        .map((line) => line.replace(/^\d+\.\s*|^[•\-\*]\s*/, "").trim())
        .filter((line) => line && !line.match(/^#+/));
    }

    // 解析教学重点
    const keyPointsMatch = content.match(
      /(?:教学重点|重点)[：:]\s*([\s\S]*?)(?=\n(?:##|教学难点|教学方法|$))/i,
    );
    if (keyPointsMatch) {
      parsed.keyPoints = keyPointsMatch[1]
        .split(/\n/)
        .map((line) => line.replace(/^\d+\.\s*|^[•\-\*]\s*/, "").trim())
        .filter((line) => line && !line.match(/^#+/));
    }

    // 解析教学难点
    const difficultiesMatch = content.match(
      /(?:教学难点|难点)[：:]\s*([\s\S]*?)(?=\n(?:##|教学方法|教学过程|$))/i,
    );
    if (difficultiesMatch) {
      parsed.difficulties = difficultiesMatch[1]
        .split(/\n/)
        .map((line) => line.replace(/^\d+\.\s*|^[•\-\*]\s*/, "").trim())
        .filter((line) => line && !line.match(/^#+/));
    }

    // 解析教学方法
    const methodsMatch = content.match(
      /(?:教学方法|方法)[：:]\s*([\s\S]*?)(?=\n(?:##|教学过程|教学准备|$))/i,
    );
    if (methodsMatch) {
      parsed.methods = methodsMatch[1]
        .split(/\n/)
        .map((line) => line.replace(/^\d+\.\s*|^[•\-\*]\s*/, "").trim())
        .filter((line) => line && !line.match(/^#+/));
    }

    // 解析教学过程
    const processMatch = content.match(
      /(?:教学过程|课堂流程)[：:]\s*([\s\S]*?)(?=\n(?:##|课后作业|教学反思|$))/i,
    );
    if (processMatch) {
      const processText = processMatch[1];
      const stages = processText.split(
        /(?=###\s*|^\d+\.\s*|\n(?:导入|新课|练习|小结|作业))/m,
      );

      stages.forEach((stage) => {
        const stageMatch = stage.match(
          /(?:###\s*)?(.+?)(?:\s*\((\d+)分钟\))?\s*\n([\s\S]*)/,
        );
        if (stageMatch) {
          const stageName = stageMatch[1].replace(/^\d+\.\s*/, "").trim();
          const duration = stageMatch[2] ? parseInt(stageMatch[2]) : undefined;
          const stageContent = stageMatch[3]
            .split(/\n/)
            .map((line) => line.replace(/^\d+\.\s*|^[•\-\*]\s*/, "").trim())
            .filter((line) => line && !line.match(/^#+/));

          if (stageName && stageContent.length > 0) {
            parsed.process.push({
              stage: stageName,
              content: stageContent,
              duration,
            });
          }
        }
      });
    }

    // 解析教学材料
    const materialsMatch = content.match(
      /(?:教学准备|教学材料|准备材料)[：:]\s*([\s\S]*?)(?=\n(?:##|教学过程|$))/i,
    );
    if (materialsMatch) {
      parsed.materials = materialsMatch[1]
        .split(/\n/)
        .map((line) => line.replace(/^\d+\.\s*|^[•\-\*]\s*/, "").trim())
        .filter((line) => line && !line.match(/^#+/));
    }

    // 解析课后作业
    const homeworkMatch = content.match(
      /(?:课后作业|作业安排|作业)[：:]\s*([\s\S]*?)(?=\n(?:##|教学反思|$))/i,
    );
    if (homeworkMatch) {
      parsed.homework = homeworkMatch[1]
        .split(/\n/)
        .map((line) => line.replace(/^\d+\.\s*|^[•\-\*]\s*/, "").trim())
        .filter((line) => line && !line.match(/^#+/));
    }

    return parsed;
  }, [enrichedLessonData?.textContent]);

  // 优化的图表内容生成 - 使用 useMemo 缓存
  const diagramContent = useMemo(() => {
    if (!enrichedLessonData) return "";

    // 图表工具函数
    const diagramUtils = {
      // 智能长度检测器 - 根据内容类型动态调整长度限制
      getSmartLength: (text: string, baseLength: number): number => {
        // 检测数学/科学内容
        const isMathContent = /[+\-×÷=±²³⁴⁵⁶⁷⁸⁹⁰₀₁₂₃₄₅₆₇₈₉√∆]/.test(text);
        return isMathContent ? Math.min(baseLength * 1.5, 30) : baseLength;
      },

      // 智能文本分析 - 自动调整长度的版本
      smartAnalyzeContent: (text: string, baseLength: number = 15): string => {
        const smartLength = diagramUtils.getSmartLength(text, baseLength);
        return diagramUtils.analyzeAIContent(text, smartLength);
      },
      // 智能提取关键概念，特别保护数学公式和科学表达式
      extractConcept: (text: string, maxLength: number = 15): string => {
        if (!text || text.trim().length === 0) return "";

        // 检测数学/科学表达式
        const mathPatterns = [
          // 数学公式：ax²+bx+c=0, x² 等
          /[a-zA-Z]?[²³⁴⁵⁶⁷⁸⁹⁰]?[+\-×÷=±√∆]?[a-zA-Z0-9²³⁴⁵⁶⁷⁸⁹⁰+\-×÷=±√∆\(\)\/]+/,
          // 化学式：H₂O, CO₂ 等
          /[A-Z][a-z]?[₀₁₂₃₄₅₆₇₈₉]*([A-Z][a-z]?[₀₁₂₃₄₅₆₇₈₉]*)*([+\-]|→|⇌)?/,
          // 物理公式：F=ma, E=mc² 等
          /[A-Za-z][=±+\-×÷][A-Za-z0-9²³⁴⁵⁶⁷⁸⁹⁰+\-×÷\(\)\/]+/,
          // 分数和比例：1/2, 3:4 等
          /\d+[\/:]\d+|[a-zA-Z]\/[a-zA-Z]/,
          // 包含数学符号的表达式
          /[+\-×÷=±²³⁴⁵⁶⁷⁸⁹⁰₀₁₂₃₄₅₆₇₈₉√∆]/,
        ];

        const isMathContent = mathPatterns.some((pattern) =>
          pattern.test(text),
        );

        // 智能文本清理，保留重要符号
        let cleanedText;
        if (isMathContent) {
          // 数学/科学内容：保留所有相关符号
          cleanedText = text
            .replace(
              /[^\u4e00-\u9fa5a-zA-Z0-9\s，。、+\-×÷=±√∆²³⁴⁵⁶⁷⁸⁹⁰₀₁₂₃₄₅₆₇₈₉\(\)\/→⇌:]/g,
              "",
            )
            .trim();
        } else {
          // 普通内容：标准清理
          cleanedText = text
            .replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s，。、]/g, "")
            .trim();
        }

        // 对于数学内容，使用更宽松的长度限制
        const effectiveMaxLength = isMathContent
          ? Math.min(maxLength * 1.8, 25)
          : maxLength;

        // 如果清理后的文本在限制内，直接返回
        if (cleanedText.length <= effectiveMaxLength) {
          return cleanedText;
        }

        // 智能概念提取策略
        // 1. 移除常见的冗余词汇，但保护数学内容
        const redundantWords = [
          "能够",
          "学会",
          "掌握",
          "理解",
          "培养",
          "提高",
          "加强",
          "增强",
          "学生的",
          "学生",
          "课程",
          "教学",
          "学习",
          "知识",
          "技能",
          "能力",
          "基本的",
          "重要的",
          "关键的",
          "核心的",
          "主要的",
          "相关的",
          "深入",
          "全面",
          "系统",
          "有效",
          "正确",
          "合理",
          "科学",
        ];

        let concept = cleanedText;

        // 对于非数学内容才进行冗余词移除
        if (!isMathContent) {
          for (const word of redundantWords) {
            concept = concept.replace(new RegExp(word, "g"), "");
          }
          concept = concept.trim();
        }

        // 2. 如果去除冗余后长度合适，返回
        if (concept.length <= effectiveMaxLength && concept.length > 0) {
          return concept;
        }

        // 3. 智能截断处理
        if (concept.length > effectiveMaxLength) {
          if (isMathContent) {
            // 数学内容：在数学符号处截断
            let truncated = concept.substring(0, effectiveMaxLength);
            const mathBreakPoints = ["=", "+", "-", "×", "÷", "，", "、", " "];
            let bestBreakPoint = -1;

            for (const point of mathBreakPoints) {
              const index = truncated.lastIndexOf(point);
              if (index > effectiveMaxLength * 0.6) {
                bestBreakPoint = Math.max(
                  bestBreakPoint,
                  index + (point === " " ? 0 : 1),
                );
              }
            }

            if (bestBreakPoint > 0) {
              concept = truncated.substring(0, bestBreakPoint).trim();
            } else {
              concept = truncated.trim();
            }
          } else {
            // 普通内容：在词汇边界截断
            const sentences = concept
              .split(/[，。、]/)
              .filter((s) => s.trim().length > 0);
            if (sentences.length > 0) {
              const shortestMeaningful = sentences
                .filter(
                  (s) =>
                    s.trim().length >= 2 &&
                    s.trim().length <= effectiveMaxLength,
                )
                .sort((a, b) => a.length - b.length)[0];

              if (shortestMeaningful) {
                concept = shortestMeaningful.trim();
              } else {
                // 智能截断
                let truncated = concept.substring(0, effectiveMaxLength);
                const lastSpaceIndex = Math.max(
                  truncated.lastIndexOf(" "),
                  truncated.lastIndexOf("，"),
                  truncated.lastIndexOf("、"),
                  truncated.lastIndexOf("的"),
                );

                if (lastSpaceIndex > effectiveMaxLength * 0.7) {
                  truncated = truncated.substring(0, lastSpaceIndex);
                }

                concept = truncated.trim();
              }
            }
          }
        }

        return concept || cleanedText.substring(0, effectiveMaxLength).trim();
      },

      // AI内容智能分析器（同步版本，会异步更新结果）
      analyzeAIContent: (text: string, targetLength: number = 15): string => {
        if (!text || text.trim().length === 0) return "";

        // 先用本地算法获得即时结果
        const localResult = diagramUtils.smartExtractConceptLocal(
          text,
          targetLength,
        );

        // 如果启用了AI文本处理，在后台异步优化结果
        if (useAITextProcessing) {
          diagramUtils.smartExtractConceptWithAI(
            text,
            targetLength,
            localResult,
          );
        }

        return localResult;
      },

      // 智能AI概念提取（后台异步调用，不阻塞UI）
      smartExtractConceptWithAI: async (
        text: string,
        targetLength: number = 15,
        fallback: string = "",
      ): Promise<void> => {
        try {
          const response = await fetch("http://localhost:3001/api/analyze", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              content: text,
              analysisType: "概念提取",
            }),
          });

          if (response.ok) {
            const data = await response.json();
            const extractedConcept = data.data?.result?.trim();

            // 检测是否为数学内容，调整长度限制
            const isMathContent = /[+\-×÷=±²³⁴⁵⁶⁷⁸⁹⁰₀₁₂₃₄₅₆₇₈₉√∆]/.test(text);
            const effectiveTargetLength = isMathContent
              ? Math.min(targetLength * 1.8, 25)
              : targetLength;

            if (
              extractedConcept &&
              extractedConcept.length <= effectiveTargetLength &&
              extractedConcept !== fallback
            ) {
              console.log(
                `AI优化文本 ${isMathContent ? "(数学内容)" : ""}: "${fallback}" -> "${extractedConcept}"`,
              );
              // 这里可以在未来添加状态更新来重新渲染图表
              // 目前只是记录日志，展示AI处理的结果
            }
          }
        } catch (error) {
          console.warn("AI文本处理失败:", error);
        }
      },

      // 改进的本地智能概念提取
      smartExtractConceptLocal: (
        text: string,
        targetLength: number = 15,
      ): string => {
        if (!text || text.trim().length === 0) return "";

        // 特殊处理教学术语和关键词
        const educationKeywords = {
          教学目标: "目标",
          学习目标: "目标",
          知识与技能: "知识技能",
          过程与方法: "过程方法",
          情感态度与价值观: "情感价值观",
          教学重点: "重点",
          教学难点: "难点",
          教学方法: "方法",
          教学过程: "过程",
          教学活动: "活动",
          学习活动: "学习",
          课堂练习: "练习",
          巩固练习: "巩固",
          课堂小结: "小结",
          课堂总结: "总结",
          布置作业: "作业",
          板书设计: "板书",
          教学反思: "反思",
        };

        // 学科关键词提取
        const subjectPatterns = [
          /([语文|数学|英语|物理|化学|生物|历史|地理|政治])/g,
          /([古诗|诗歌|散文|小说|议论文|说明文])/g,
          /([加法|减法|乘法|除法|分数|小数|方程|函数])/g,
          /([语法|词汇|阅读|写作|听力|口语])/g,
        ];

        let processed = text.trim();

        // 1. 替换教育术语
        for (const [full, short] of Object.entries(educationKeywords)) {
          processed = processed.replace(new RegExp(full, "g"), short);
        }

        // 2. 提取核心概念
        const conceptPatterns = [
          /理解(.{1,8}?)[的|，|。]/g,
          /掌握(.{1,8}?)[的|，|。]/g,
          /学会(.{1,8}?)[的|，|。]/g,
          /认识(.{1,8}?)[的|，|。]/g,
          /了解(.{1,8}?)[的|，|。]/g,
          /培养(.{1,8}?)[的|，|。]/g,
          /(.{1,8}?)概念/g,
          /(.{1,8}?)原理/g,
          /(.{1,8}?)方法/g,
          /(.{1,8}?)技巧/g,
        ];

        const extractedConcepts: string[] = [];
        for (const pattern of conceptPatterns) {
          let match;
          pattern.lastIndex = 0;
          while ((match = pattern.exec(processed)) !== null) {
            if (match[1] && match[1].length > 1) {
              extractedConcepts.push(match[1]);
            }
          }
        }

        // 3. 如果提取到概念，优先使用最相关的
        if (extractedConcepts.length > 0) {
          const uniqueConcepts = extractedConcepts.filter(
            (value, index, self) => self.indexOf(value) === index,
          );
          const bestConcept = uniqueConcepts
            .filter((c) => c.length <= targetLength)
            .sort((a, b) => {
              // 优先选择长度适中且含有学科关键词的概念
              const aHasSubject = subjectPatterns.some((p) => p.test(a));
              const bHasSubject = subjectPatterns.some((p) => p.test(b));
              if (aHasSubject && !bHasSubject) return -1;
              if (!aHasSubject && bHasSubject) return 1;
              return (
                Math.abs(a.length - targetLength * 0.7) -
                Math.abs(b.length - targetLength * 0.7)
              );
            })[0];

          if (bestConcept) {
            return bestConcept.trim();
          }
        }

        // 4. 如果没有提取到概念，使用原有的智能截断方法
        return diagramUtils.extractConcept(text, targetLength);
      },

      // 保留原有的简单清理函数作为备用
      cleanText: (text: string, maxLength: number = 15): string => {
        return (
          text
            .replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, "") // 只保留中文、英文、数字和空格
            .substring(0, maxLength)
            .trim() + (text.length > maxLength ? "..." : "")
        );
      },

      // 生成安全的节点ID
      generateNodeId: (index: number, prefix: string = ""): string => {
        return `${prefix}${String.fromCharCode(65 + index)}`;
      },

      // 验证Mermaid语法
      validateMermaidSyntax: (content: string): boolean => {
        // 基本语法检查
        if (!content.trim()) return false;

        // 检查是否有未闭合的括号
        const openBrackets = (content.match(/\[/g) || []).length;
        const closeBrackets = (content.match(/\]/g) || []).length;
        const openParens = (content.match(/\(/g) || []).length;
        const closeParens = (content.match(/\)/g) || []).length;

        return openBrackets === closeBrackets && openParens === closeParens;
      },
    };

    // 智能思维导图生成器 - 根据AI生成内容动态调整结构
    const generateMindMap = () => {
      const { title } = enrichedLessonData;
      const aiParsed = parseAIContent;

      // 优先使用AI解析的内容，如果没有则使用原始数据
      const objectives =
        (aiParsed?.objectives?.length
          ? aiParsed.objectives
          : enrichedLessonData.detailedObjectives) || [];
      const keyPoints =
        (aiParsed?.keyPoints?.length
          ? aiParsed.keyPoints
          : enrichedLessonData.keyPoints) || [];
      const difficulties =
        (aiParsed?.difficulties?.length
          ? aiParsed.difficulties
          : enrichedLessonData.difficulties) || [];
      const methods =
        (aiParsed?.methods?.length
          ? aiParsed.methods
          : enrichedLessonData.teachingMethods) || [];
      const process =
        (aiParsed?.process?.length
          ? aiParsed.process
          : enrichedLessonData.teachingProcess) || [];

      // 如果没有足够的内容，返回提示信息
      if (
        !title &&
        objectives.length === 0 &&
        keyPoints.length === 0 &&
        process.length === 0
      ) {
        return `mindmap
  root((请先生成教案内容))
    提示
      点击上方生成教案按钮
      获取AI生成的完整内容`;
      }

      const cleanTitle = title
        ? diagramUtils.extractConcept(title, 20)
        : "教案内容";

      // 使用标准复杂度生成思维导图
      return generateCoreMindMap(cleanTitle, {
        objectives,
        keyPoints,
        difficulties,
        methods,
        process,
      });
    };

    // 简洁思维导图：2-3个主分支，每个分支2-3个子节点
    const generateSimpleMindMap = (title: string, content: DiagramContent) => {
      let mindmapContent = `mindmap
  root((${title}))`;

      // 优先显示核心内容
      if (content.keyPoints.length > 0) {
        mindmapContent += `
    核心内容`;
        content.keyPoints.slice(0, 3).forEach((point: string) => {
          const concept = diagramUtils.smartAnalyzeContent(point, 22);
          if (concept) {
            mindmapContent += `
      ${concept}`;
          }
        });
      }

      if (content.objectives.length > 0) {
        mindmapContent += `
    学习目标`;
        content.objectives.slice(0, 3).forEach((obj: string) => {
          const concept = diagramUtils.smartAnalyzeContent(obj, 22);
          if (concept) {
            mindmapContent += `
      ${concept}`;
          }
        });
      }

      if (content.process.length > 0) {
        mindmapContent += `
    教学流程`;
        content.process.slice(0, 3).forEach((stage: TeachingStage) => {
          const concept = diagramUtils.extractConcept(stage.stage, 15);
          if (concept) {
            mindmapContent += `
      ${concept}`;
          }
        });
      }

      return mindmapContent;
    };

    // 核心思维导图：3-4个主分支，适度的子节点
    const generateCoreMindMap = (title: string, content: DiagramContent) => {
      let mindmapContent = `mindmap
  root((${title}))`;

      // 知识要点
      if (content.keyPoints.length > 0) {
        mindmapContent += `
    知识要点`;
        content.keyPoints.slice(0, 3).forEach((point: string) => {
          const concept = diagramUtils.smartAnalyzeContent(point, 20);
          if (concept) {
            mindmapContent += `
      ${concept}`;
          }
        });
      }

      // 学习目标
      if (content.objectives.length > 0) {
        mindmapContent += `
    学习目标`;
        content.objectives.slice(0, 2).forEach((obj: string) => {
          const concept = diagramUtils.smartAnalyzeContent(obj, 20);
          if (concept) {
            mindmapContent += `
      ${concept}`;
          }
        });
      }

      // 重难点
      if (content.difficulties.length > 0) {
        mindmapContent += `
    重难点`;
        content.difficulties.slice(0, 2).forEach((diff: string) => {
          const concept = diagramUtils.smartAnalyzeContent(diff, 20);
          if (concept) {
            mindmapContent += `
      ${concept}`;
          }
        });
      }

      // 教学方法
      if (
        content.methods.length > 0 &&
        content.methods.some((m: string) => m.trim().length > 0)
      ) {
        mindmapContent += `
    教学方法`;
        content.methods.slice(0, 3).forEach((method: string) => {
          const concept = diagramUtils.extractConcept(method, 15);
          if (concept) {
            mindmapContent += `
      ${concept}`;
          }
        });
      }

      return mindmapContent;
    };

    // 层次思维导图：完整结构但简化展示
    const generateLayeredMindMap = (title: string, content: DiagramContent) => {
      let mindmapContent = `mindmap
  root((${title}))`;

      // 教学设计
      mindmapContent += `
    教学设计`;

      if (content.objectives.length > 0) {
        const topObjective = diagramUtils.smartAnalyzeContent(
          content.objectives[0],
          18,
        );
        if (topObjective) {
          mindmapContent += `
      ${topObjective}`;
        }
      }

      if (content.methods.length > 0) {
        const topMethod = diagramUtils.extractConcept(content.methods[0], 15);
        if (topMethod) {
          mindmapContent += `
      ${topMethod}`;
        }
      }

      // 核心内容
      mindmapContent += `
    核心内容`;
      content.keyPoints.slice(0, 2).forEach((point: string) => {
        const concept = diagramUtils.smartAnalyzeContent(point, 18);
        if (concept) {
          mindmapContent += `
      ${concept}`;
        }
      });

      // 教学过程
      mindmapContent += `
    教学过程`;
      content.process.slice(0, 4).forEach((stage: TeachingStage) => {
        const concept = diagramUtils.extractConcept(stage.stage, 12);
        if (concept) {
          mindmapContent += `
      ${concept}`;
        }
      });

      return mindmapContent;
    };

    // 智能流程图生成器 - 基于AI生成的教学流程
    const generateFlowchart = () => {
      const aiParsed = parseAIContent;
      const process = aiParsed?.process?.length
        ? aiParsed.process
        : enrichedLessonData.teachingProcess || [];

      // 如果没有教学过程数据，返回提示信息
      if (process.length === 0) {
        return `graph TD
    A[请先生成教案内容] --> B[获取完整的教学流程]
    B --> C[生成专业流程图]
    
    style A fill:#fff2cc
    style C fill:#d5e8d4`;
      }

      // 使用标准复杂度生成流程图
      return generateStandardFlowchart(process);
    };

    // 简单流程图：3个或更少的步骤
    const generateSimpleFlowchart = (process: TeachingStage[]) => {
      const steps = [
        "开始",
        ...process.map((p) => diagramUtils.extractConcept(p.stage, 12)),
        "结束",
      ];
      const nodeIds = steps.map((_, i) => String.fromCharCode(65 + i));

      const flowchart = `graph LR
${nodeIds
  .slice(0, -1)
  .map(
    (nodeId, i) =>
      `    ${nodeId}[${steps[i]}] --> ${nodeIds[i + 1]}[${steps[i + 1]}]`,
  )
  .join("")}
    
    style A fill:#e1f5fe
    style ${nodeIds[nodeIds.length - 1]} fill:#e8f5e8`;

      return flowchart;
    };

    // 标准流程图：清晰的线性教学流程
    const generateStandardFlowchart = (process: TeachingStage[]) => {
      // 如果没有教学过程，生成标准教学流程
      if (process.length === 0) {
        return `graph TD
    A[🔔 上课铃响] --> B[📚 课程导入]
    B --> C[🎯 学习目标]
    C --> D[📖 新课讲解]
    D --> E[✍️ 课堂练习]
    E --> F[💡 重点巩固]
    F --> G[📝 课堂小结]
    G --> H[📋 布置作业]
    H --> I[👋 下课]
    
    style A fill:#e3f2fd
    style E fill:#fff3e0
    style I fill:#e8f5e8`;
      }

      // 基于AI解析的教学过程生成流程图
      let flowchart = `graph TD`;
      const maxSteps = Math.min(process.length, 8); // 限制最多8个步骤
      const steps = process.slice(0, maxSteps);

      // 生成节点标识
      const nodeIds = ["A", "B", "C", "D", "E", "F", "G", "H", "I"];

      // 添加开始节点
      const firstStage = diagramUtils.extractConcept(
        steps[0]?.stage || "课程导入",
        12,
      );
      flowchart += `
    A[🔔 开始上课] --> B[${firstStage}]`;

      // 添加中间教学环节
      for (let i = 1; i < steps.length; i++) {
        const currentNode = nodeIds[i + 1];
        const prevNode = nodeIds[i];
        const stageName = diagramUtils.extractConcept(steps[i].stage, 12);

        // 根据教学环节添加合适的图标
        let icon = "";
        const stageText = steps[i].stage.toLowerCase();
        if (stageText.includes("导入") || stageText.includes("引入"))
          icon = "📚";
        else if (stageText.includes("讲解") || stageText.includes("教学"))
          icon = "📖";
        else if (stageText.includes("练习") || stageText.includes("实践"))
          icon = "✍️";
        else if (stageText.includes("讨论") || stageText.includes("互动"))
          icon = "💬";
        else if (stageText.includes("总结") || stageText.includes("小结"))
          icon = "📝";
        else if (stageText.includes("作业") || stageText.includes("任务"))
          icon = "📋";
        else icon = "🎯";

        flowchart += `
    ${prevNode} --> ${currentNode}[${icon} ${stageName}]`;
      }

      // 添加结束节点
      const lastNode = nodeIds[steps.length + 1];
      const prevLastNode = nodeIds[steps.length];
      flowchart += `
    ${prevLastNode} --> ${lastNode}[👋 课程结束]`;

      // 添加样式
      flowchart += `
    
    style A fill:#e3f2fd
    style ${lastNode} fill:#e8f5e8`;

      // 为主要教学环节添加强调色
      if (steps.length >= 3) {
        const midNode = nodeIds[Math.floor(steps.length / 2) + 1];
        flowchart += `
    style ${midNode} fill:#fff3e0`;
      }

      return flowchart;
    };

    // 紧凑流程图：多个步骤的简化展示
    const generateCompactFlowchart = (process: TeachingStage[]) => {
      const coreSteps = [
        process[0], // 开始
        process[Math.floor(process.length * 0.3)], // 前期
        process[Math.floor(process.length * 0.6)], // 中期
        process[process.length - 1], // 结束
      ].filter(Boolean);

      let flowchart = `graph TD
    A[开始] --> B[${diagramUtils.extractConcept(coreSteps[0]?.stage || "导入", 10)}]
    B --> C[${diagramUtils.extractConcept(coreSteps[1]?.stage || "学习", 10)}]
    C --> D[${diagramUtils.extractConcept(coreSteps[2]?.stage || "练习", 10)}]
    D --> E[${diagramUtils.extractConcept(coreSteps[3]?.stage || "总结", 10)}]
    E --> F[结束]
    
    style A fill:#e1f5fe
    style F fill:#e8f5e8
    style C fill:#f3e5f5`;

      return flowchart;
    };

    // 智能时间线生成器 - 基于AI生成的时间安排
    const generateTimeline = () => {
      const { duration, title } = enrichedLessonData;
      const totalMinutes = typeof duration === "number" ? duration : 45;
      const aiParsed = parseAIContent;
      const process = aiParsed?.process?.length
        ? aiParsed.process
        : enrichedLessonData.teachingProcess || [];

      // 如果没有内容，返回提示信息
      if (!title && process.length === 0) {
        return `timeline
    title 请先生成教案内容
    
    section 提示
        0-5分钟 : 点击生成教案按钮
                : 获取AI生成的完整内容
        
    section 等待中
        5-45分钟 : 教学流程将在这里显示
                 : 包含详细的时间安排`;
      }

      const cleanTitle = title
        ? diagramUtils.extractConcept(title, 20)
        : "教案时间线";

      // 使用标准复杂度生成时间线
      return generateStandardTimeline(cleanTitle, totalMinutes, process);
    };

    // 简单时间线：3个或更少的环节
    const generateSimpleTimeline = (
      title: string,
      totalMinutes: number,
      process: TeachingStage[],
    ) => {
      const timePerSection = Math.floor(
        totalMinutes / Math.max(process.length, 3),
      );

      let timeline = `timeline
    title ${title} (${totalMinutes}分钟)`;

      let currentTime = 0;
      process.forEach((stage) => {
        const startTime = currentTime;
        const endTime = Math.min(currentTime + timePerSection, totalMinutes);
        const stageName = diagramUtils.extractConcept(stage.stage, 15);

        timeline += `
    
    section ${stageName}
        ${startTime}-${endTime}分钟 : ${stageName}核心内容`;

        if (stage.content && stage.content.length > 0) {
          const mainContent = diagramUtils.analyzeAIContent(
            stage.content[0],
            25,
          );
          if (mainContent) {
            timeline += `
                    : ${mainContent}`;
          }
        }

        currentTime = endTime;
      });

      return timeline;
    };

    // 标准时间线：4-5个环节的详细安排
    const generateStandardTimeline = (
      title: string,
      totalMinutes: number,
      process: TeachingStage[],
    ) => {
      let timeline = `timeline
    title ${title} 教学安排 (${totalMinutes}分钟)
    
    section 课前
        0-5分钟 : 准备教具
                : 检查设备`;

      const processTime = totalMinutes - 10; // 预留课前课后时间
      const timePerSection = Math.floor(processTime / process.length);

      let currentTime = 5;
      process.forEach((stage, index) => {
        const stageDuration =
          index === process.length - 1
            ? totalMinutes - 5 - currentTime
            : timePerSection; // 最后一个环节用完剩余时间
        const endTime = currentTime + stageDuration;
        const stageName = diagramUtils.extractConcept(stage.stage, 12);

        timeline += `
    
    section ${stageName}
        ${currentTime}-${endTime}分钟`;

        if (stage.content && stage.content.length > 0) {
          stage.content.slice(0, 2).forEach((content: string) => {
            const concept = diagramUtils.analyzeAIContent(content, 22);
            if (concept) {
              timeline += ` : ${concept}`;
            }
          });
        } else {
          timeline += ` : ${stageName}相关活动`;
        }

        currentTime = endTime;
      });

      timeline += `
    
    section 课后
        ${totalMinutes}-${totalMinutes + 5}分钟 : 整理教具
                                            : 课后反思`;

      return timeline;
    };

    // 紧凑时间线：多环节的精简展示
    const generateCompactTimeline = (
      title: string,
      totalMinutes: number,
      process: TeachingStage[],
    ) => {
      // 选择关键环节
      const keyStages = [
        process[0], // 开始
        process[Math.floor(process.length * 0.4)], // 前期
        process[Math.floor(process.length * 0.7)], // 中期
        process[process.length - 1], // 结束
      ].filter(Boolean);

      let timeline = `timeline
    title ${title} 核心环节 (${totalMinutes}分钟)`;

      const sectionTime = Math.floor(totalMinutes / keyStages.length);

      keyStages.forEach((stage, index) => {
        const startTime = index * sectionTime;
        const endTime = (index + 1) * sectionTime;
        const stageName = diagramUtils.extractConcept(stage.stage, 12);

        timeline += `
    
    section ${stageName}
        ${startTime}-${endTime}分钟 : ${stageName}重点内容`;

        if (stage.content && stage.content.length > 0) {
          const concept = diagramUtils.analyzeAIContent(stage.content[0], 20);
          if (concept) {
            timeline += `
                            : ${concept}`;
          }
        }
      });

      return timeline;
    };

    switch (selectedFormat) {
      case "mindmap":
        return generateMindMap();
      case "flowchart":
        return generateFlowchart();
      case "timeline":
        return generateTimeline();
      default:
        return "";
    }
  }, [
    selectedFormat,
    enrichedLessonData,
    parseAIContent,
    diagramComplexity,
    useAITextProcessing,
  ]);

  const handleFormatChange = (formatId: string) => {
    setSelectedFormat(formatId);
  };

  if (!enrichedLessonData) {
    return (
      <div className="text-center py-8 text-gray-500">请先生成教案内容</div>
    );
  }

  return (
    <div className="lesson-plan-generator">
      {/* 用户偏好信息 */}
      <div className="user-preferences mb-6 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
        <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2 flex items-center gap-2">
          👤 基于您的教学偏好推荐
        </h3>
        <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
          <div className="flex items-center gap-4">
            <span>
              📚 主要科目: <strong>{getSubjectLabel(settings.subject)}</strong>
            </span>
            <span>
              🎓 教学阶段:{" "}
              <strong>{getGradeLevelLabel(settings.gradeLevel)}</strong>
            </span>
            {settings.easyMode && (
              <span className="bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded text-xs">
                简易模式
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 格式选择器 */}
      <div className="format-selector mb-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
          选择教案展示格式
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {formats.map((format) => (
            <button
              key={format.id}
              onClick={() => handleFormatChange(format.id)}
              className={`p-4 rounded-xl border-2 transition-all ${
                selectedFormat === format.id
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                  : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
              }`}
            >
              <div className="text-center">
                <div className="text-2xl mb-2">{format.icon}</div>
                <div className="font-medium text-sm text-gray-900 dark:text-white">
                  {format.name}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {format.description}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 内容展示区域 */}
      <div className="content-display">
        {selectedFormat === "text" && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 text-white p-4">
              <h2
                className="text-xl font-bold"
                style={{ color: isDarkMode ? "#ffffff" : "#000000" }}
              >
                📚 {enrichedLessonData.subject} 教案
              </h2>
              <p
                className="text-sm mt-1"
                style={{
                  color: isDarkMode
                    ? "rgba(255, 255, 255, 0.8)"
                    : "rgba(0, 0, 0, 0.7)",
                }}
              >
                {enrichedLessonData.grade} · {enrichedLessonData.title}
              </p>
            </div>
            <div className="p-8 space-y-6">
              <div
                className="prose prose-lg max-w-none dark:prose-invert 
                           prose-headings:text-gray-900 dark:prose-headings:text-white
                           prose-h1:text-2xl prose-h1:font-bold prose-h1:border-b prose-h1:border-gray-200 prose-h1:pb-2 prose-h1:mb-4
                           prose-h2:text-xl prose-h2:font-semibold prose-h2:text-blue-600 dark:prose-h2:text-blue-400 prose-h2:mt-8 prose-h2:mb-4
                           prose-h3:text-lg prose-h3:font-semibold prose-h3:text-green-600 dark:prose-h3:text-green-400 prose-h3:mt-6 prose-h3:mb-3
                           prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-p:leading-relaxed prose-p:mb-4
                           prose-ul:space-y-2 prose-li:text-gray-700 dark:prose-li:text-gray-300
                           prose-table:border prose-table:border-gray-200 dark:prose-table:border-gray-700
                           prose-th:bg-gray-50 dark:prose-th:bg-gray-800 prose-th:p-3 prose-th:font-semibold
                           prose-td:p-3 prose-td:border-t prose-td:border-gray-200 dark:prose-td:border-gray-700
                           prose-code:bg-gray-100 dark:prose-code:bg-gray-800 prose-code:px-2 prose-code:py-1 prose-code:rounded
                           prose-blockquote:border-l-4 prose-blockquote:border-blue-500 prose-blockquote:pl-4 prose-blockquote:italic
                           prose-hr:border-gray-300 dark:prose-hr:border-gray-600 prose-hr:my-8"
              >
                <StreamingMarkdown
                  content={
                    enrichedLessonData.textContent || "教案内容加载中..."
                  }
                  isStreaming={isStreaming || false}
                  className=""
                />
              </div>
            </div>
          </div>
        )}

        {selectedFormat === "flowchart" && (
          <div className="flowchart-section">
            <InteractiveFlowchart
              process={enrichedLessonData.teachingProcess || []}
              title={enrichedLessonData.title}
              totalDuration={
                typeof enrichedLessonData.duration === "number"
                  ? enrichedLessonData.duration
                  : 45
              }
              className="my-6"
            />
          </div>
        )}

        {(selectedFormat === "mindmap" || selectedFormat === "timeline") && (
          <div className="diagram-section">
            <DiagramRenderer
              content={diagramContent}
              type={selectedFormat as "mindmap" | "flowchart" | "timeline"}
              className="my-6"
            />
          </div>
        )}

        {selectedFormat === "interactive" && (
          <div className="interactive-section">
            <InteractiveLesson
              lessonData={{
                subject: enrichedLessonData.subject,
                grade: enrichedLessonData.grade,
                title: enrichedLessonData.title,
                duration:
                  typeof enrichedLessonData.duration === "number"
                    ? enrichedLessonData.duration
                    : 45,
                detailedObjectives:
                  (parseAIContent?.objectives?.length
                    ? parseAIContent.objectives
                    : enrichedLessonData.detailedObjectives) || [],
                keyPoints:
                  (parseAIContent?.keyPoints?.length
                    ? parseAIContent.keyPoints
                    : enrichedLessonData.keyPoints) || [],
                difficulties:
                  (parseAIContent?.difficulties?.length
                    ? parseAIContent.difficulties
                    : enrichedLessonData.difficulties) || [],
                teachingMethods:
                  (parseAIContent?.methods?.length
                    ? parseAIContent.methods
                    : enrichedLessonData.teachingMethods) || [],
                teachingProcess:
                  (parseAIContent?.process?.length
                    ? parseAIContent.process
                    : enrichedLessonData.teachingProcess) || [],
              }}
              className="my-6"
            />
          </div>
        )}
      </div>
    </div>
  );
}
