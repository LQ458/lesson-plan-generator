"use client";

import { useState, useMemo, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import DiagramRenderer from "./diagram-renderer";
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
}

export default function LessonPlanGenerator({
  lessonData,
}: LessonPlanGeneratorProps) {
  const { settings } = useSettings();
  const [selectedFormat, setSelectedFormat] = useState("text");
  const [isDarkMode, setIsDarkMode] = useState(false);

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

  // 生成丰富的教案内容
  const enrichedLessonData = useMemo(() => {
    if (!lessonData) return null;

    const subject = lessonData.subject || "语文";
    const grade = lessonData.grade || "小学一年级";
    const title = lessonData.title || "示例课题";

    return {
      ...lessonData,
      detailedObjectives: [
        `掌握${title}的基本概念和核心知识点`,
        `能够运用${title}相关方法解决实际问题`,
        `培养学生的${subject}学科思维能力`,
        `提高学生的学习兴趣和参与积极性`,
      ],
      keyPoints: [
        `${title}的定义和特征`,
        `${title}的基本原理和规律`,
        `${title}的应用方法和技巧`,
        `${title}与其他知识点的联系`,
      ],
      difficulties: [
        `${title}概念的深层理解`,
        `理论与实践的有机结合`,
        `知识点间的逻辑关系`,
        `灵活运用解决复杂问题`,
      ],
      teachingMethods: [
        "讲授法 - 系统讲解核心概念",
        "讨论法 - 引导学生思考交流",
        "演示法 - 直观展示操作过程",
        "练习法 - 巩固所学知识技能",
      ],
      teachingProcess: [
        {
          stage: "导入新课",
          duration:
            (typeof lessonData.duration === "object" &&
              lessonData.duration?.intro) ||
            5,
          content: [
            "复习相关预备知识",
            "创设问题情境",
            "引出本课主题",
            "明确学习目标",
          ],
        },
        {
          stage: "新课讲解",
          duration:
            (typeof lessonData.duration === "object" &&
              lessonData.duration?.main) ||
            25,
          content: [
            `详细讲解${title}的基本概念`,
            "分析重点知识点",
            "举例说明应用方法",
            "引导学生理解难点",
          ],
        },
        {
          stage: "巩固练习",
          duration:
            (typeof lessonData.duration === "object" &&
              lessonData.duration?.practice) ||
            10,
          content: [
            "设计针对性练习题",
            "学生独立完成练习",
            "小组讨论交流",
            "教师点评指导",
          ],
        },
        {
          stage: "课堂总结",
          duration:
            (typeof lessonData.duration === "object" &&
              lessonData.duration?.summary) ||
            5,
          content: [
            "总结本课重点内容",
            "强调关键知识点",
            "布置课后作业",
            "预告下节课内容",
          ],
        },
      ],
    };
  }, [lessonData]);

  // 优化的图表内容生成 - 使用 useMemo 缓存
  const diagramContent = useMemo(() => {
    if (!enrichedLessonData) return "";

    const generateMindMap = () => {
      const { subject, title, keyPoints, difficulties, teachingMethods } =
        enrichedLessonData;

      return `mindmap
  root((${title}))
    教学目标
      知识技能
        掌握${subject}基础概念
        理解核心原理
      过程方法
        培养思维能力
        提高实践技能
      情感态度
        激发学习兴趣
        培养良好习惯
    教学重点
      ${keyPoints
        .slice(0, 3)
        .map((point: string, index: number) => `重点${index + 1}[${point}]`)
        .join("\n      ")}
    教学难点
      ${difficulties
        .slice(0, 3)
        .map((diff: string, index: number) => `难点${index + 1}[${diff}]`)
        .join("\n      ")}
    教学方法
      ${teachingMethods
        .slice(0, 3)
        .map((method: string, index: number) => `方法${index + 1}[${method}]`)
        .join("\n      ")}
    教学过程
      导入环节
        创设情境
        明确目标
      新知探究
        概念讲解
        方法指导
        互动交流
      巩固练习
        基础练习
        提高练习
        拓展练习
      课堂小结
        总结重点
        布置作业`;
    };

    const generateFlowchart = () => {
      return `graph TD
    A[开始上课] --> B[课前准备]
    B --> C[导入新课]
    C --> D[明确学习目标]
    D --> E[新知识讲解]
    E --> F[师生互动讨论]
    F --> G[课堂练习]
    G --> H{学生是否理解}
    H -->|是| I[巩固提高]
    H -->|否| J[重点讲解]
    J --> E
    I --> K[课堂小结]
    K --> L[布置作业]
    L --> M[下课]
    
    style A fill:#e1f5fe
    style M fill:#e8f5e8
    style H fill:#fff3e0
    style E fill:#f3e5f5
    style G fill:#e8f5e8`;
    };

    const generateTimeline = () => {
      const { duration } = enrichedLessonData;
      const totalMinutes = typeof duration === "number" ? duration : 45;

      return `timeline
    title ${enrichedLessonData.title} 教学时间安排
    
    section 课前准备
        课前5分钟     : 检查设备
                     : 准备教具
                     : 整理教案
    
    section 导入新课
        第1-${Math.round(totalMinutes * 0.1)}分钟    : 复习旧知
                                                   : 创设情境
                                                   : 引出主题
    
    section 新知探究
        第${Math.round(totalMinutes * 0.1) + 1}-${Math.round(totalMinutes * 0.6)}分钟    : 概念讲解
                                                                                        : 方法指导
                                                                                        : 师生互动
                                                                                        : 重点强调
    
    section 巩固练习
        第${Math.round(totalMinutes * 0.6) + 1}-${Math.round(totalMinutes * 0.85)}分钟    : 基础练习
                                                                                         : 提高练习
                                                                                         : 学生展示
    
    section 课堂小结
        第${Math.round(totalMinutes * 0.85) + 1}-${totalMinutes}分钟    : 总结重点
                                                                       : 强调难点
                                                                       : 布置作业`;
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
  }, [selectedFormat, enrichedLessonData]);

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
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({ children }) => (
                      <h1 className="text-2xl font-bold text-gray-900 dark:text-white border-b border-gray-200 pb-2 mb-4">
                        {children}
                      </h1>
                    ),
                    h2: ({ children }) => (
                      <h2 className="text-xl font-semibold text-blue-600 dark:text-blue-400 mt-8 mb-4">
                        {children}
                      </h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="text-lg font-semibold text-green-600 dark:text-green-400 mt-6 mb-3">
                        {children}
                      </h3>
                    ),
                    table: ({ children }) => (
                      <div className="overflow-x-auto my-6">
                        <table className="min-w-full border border-gray-200 dark:border-gray-700 rounded-lg">
                          {children}
                        </table>
                      </div>
                    ),
                    th: ({ children }) => (
                      <th className="bg-gray-50 dark:bg-gray-800 p-3 text-left font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700">
                        {children}
                      </th>
                    ),
                    td: ({ children }) => (
                      <td className="p-3 text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                        {children}
                      </td>
                    ),
                    ul: ({ children }) => (
                      <ul className="space-y-2 my-4">{children}</ul>
                    ),
                    li: ({ children }) => (
                      <li className="text-gray-700 dark:text-gray-300 flex items-start">
                        <span className="text-blue-500 mr-2 mt-1">•</span>
                        <span>{children}</span>
                      </li>
                    ),
                    p: ({ children }) => (
                      <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                        {children}
                      </p>
                    ),
                    hr: () => (
                      <hr className="border-gray-300 dark:border-gray-600 my-8" />
                    ),
                    code: ({ children }) => (
                      <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-sm font-mono">
                        {children}
                      </code>
                    ),
                    pre: ({ children }) => (
                      <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto my-4">
                        {children}
                      </pre>
                    ),
                  }}
                >
                  {enrichedLessonData.textContent || "教案内容加载中..."}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        )}

        {(selectedFormat === "mindmap" ||
          selectedFormat === "flowchart" ||
          selectedFormat === "timeline") && (
          <DiagramRenderer
            content={diagramContent}
            type={selectedFormat as "mindmap" | "flowchart" | "timeline"}
            className="my-6"
          />
        )}

        {selectedFormat === "interactive" && (
          <div className="interactive-lesson-plan bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
            <h3 className="text-xl font-bold mb-6 text-gray-900 dark:text-white">
              交互式教案 - {enrichedLessonData.title}
            </h3>
            <div className="space-y-4">
              {/* 教学目标 */}
              <details className="border rounded-lg p-4 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                <summary className="font-semibold cursor-pointer text-blue-900 dark:text-blue-100 flex items-center gap-2">
                  🎯 教学目标{" "}
                  <span className="text-sm text-blue-600 dark:text-blue-400">
                    (点击展开)
                  </span>
                </summary>
                <div className="mt-4 pl-4 space-y-2">
                  {enrichedLessonData.detailedObjectives.map(
                    (obj: string, index: number) => (
                      <div
                        key={index}
                        className="flex items-start gap-2 text-blue-800 dark:text-blue-200"
                      >
                        <span className="font-medium text-blue-600 dark:text-blue-400">
                          {index + 1}.
                        </span>
                        <span>{obj}</span>
                      </div>
                    ),
                  )}
                </div>
              </details>

              {/* 教学过程 */}
              <details className="border rounded-lg p-4 bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                <summary className="font-semibold cursor-pointer text-green-900 dark:text-green-100 flex items-center gap-2">
                  📚 教学过程{" "}
                  <span className="text-sm text-green-600 dark:text-green-400">
                    (点击展开)
                  </span>
                </summary>
                <div className="mt-4 space-y-4">
                  {enrichedLessonData.teachingProcess.map(
                    (
                      stage: {
                        stage: string;
                        duration: number;
                        content: string[];
                      },
                      index: number,
                    ) => (
                      <div
                        key={index}
                        className="border-l-4 border-green-400 pl-4"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold text-green-800 dark:text-green-200">
                            {stage.stage}
                          </span>
                          <span className="text-sm bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200 px-2 py-1 rounded">
                            {stage.duration}分钟
                          </span>
                        </div>
                        <ul className="space-y-1 text-green-700 dark:text-green-300">
                          {stage.content.map(
                            (item: string, itemIndex: number) => (
                              <li
                                key={itemIndex}
                                className="flex items-start gap-2"
                              >
                                <span className="text-green-500 mt-1">•</span>
                                <span>{item}</span>
                              </li>
                            ),
                          )}
                        </ul>
                      </div>
                    ),
                  )}
                </div>
              </details>

              {/* 重点难点 */}
              <details className="border rounded-lg p-4 bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800">
                <summary className="font-semibold cursor-pointer text-orange-900 dark:text-orange-100 flex items-center gap-2">
                  🔍 重点难点{" "}
                  <span className="text-sm text-orange-600 dark:text-orange-400">
                    (点击展开)
                  </span>
                </summary>
                <div className="mt-4 grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold text-orange-800 dark:text-orange-200 mb-2">
                      教学重点
                    </h4>
                    <ul className="space-y-1">
                      {enrichedLessonData.keyPoints.map(
                        (point: string, index: number) => (
                          <li
                            key={index}
                            className="flex items-start gap-2 text-orange-700 dark:text-orange-300"
                          >
                            <span className="text-orange-500 mt-1">▪</span>
                            <span>{point}</span>
                          </li>
                        ),
                      )}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-orange-800 dark:text-orange-200 mb-2">
                      教学难点
                    </h4>
                    <ul className="space-y-1">
                      {enrichedLessonData.difficulties.map(
                        (diff: string, index: number) => (
                          <li
                            key={index}
                            className="flex items-start gap-2 text-orange-700 dark:text-orange-300"
                          >
                            <span className="text-orange-500 mt-1">▪</span>
                            <span>{diff}</span>
                          </li>
                        ),
                      )}
                    </ul>
                  </div>
                </div>
              </details>

              {/* 教学方法 */}
              <details className="border rounded-lg p-4 bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800">
                <summary className="font-semibold cursor-pointer text-purple-900 dark:text-purple-100 flex items-center gap-2">
                  🎓 教学方法{" "}
                  <span className="text-sm text-purple-600 dark:text-purple-400">
                    (点击展开)
                  </span>
                </summary>
                <div className="mt-4 grid md:grid-cols-2 gap-3">
                  {enrichedLessonData.teachingMethods.map(
                    (method: string, index: number) => (
                      <div
                        key={index}
                        className="bg-purple-100 dark:bg-purple-900 rounded-lg p-3"
                      >
                        <span className="text-purple-800 dark:text-purple-200">
                          {method}
                        </span>
                      </div>
                    ),
                  )}
                </div>
              </details>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
